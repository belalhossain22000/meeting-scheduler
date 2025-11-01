import { addMinutes } from "date-fns";
import prisma from "../../../shared/prisma";
import {
  AlternativeOption,
  Booking,
  MeetingRequestData,
  Room,
} from "./MeetingRequest.interface";

const CLEANUP_BUFFER = 15;

const hasRequiredEquipment = (
  room: Room,
  requiredEquipmentIds: string[]
): boolean => {
  if (requiredEquipmentIds.length === 0) return true;

  const roomEquipmentIds = room.roomEquipment
    .map((re) => re.equipmentId)
    .filter((id): id is string => !!id);

  return requiredEquipmentIds.every((reqId) =>
    roomEquipmentIds.includes(reqId)
  );
};

const isRoomAvailable = (
  room: Room,
  startTime: Date,
  duration: number,
  existingBookings: Booking[]
): boolean => {
  const requestStart =
    startTime instanceof Date ? startTime : new Date(startTime);
  const requestEnd = addMinutes(requestStart, duration);
  const requestStartWithBuffer = addMinutes(requestStart, -CLEANUP_BUFFER);
  const requestEndWithBuffer = addMinutes(requestEnd, CLEANUP_BUFFER);

  const hasConflict = existingBookings.some((booking) => {
    if (!booking.roomId || booking.roomId !== room.id) return false;

    const bookingStart = new Date(booking.startAt);
    const bookingEnd = new Date(booking.endAt);

    return (
      bookingStart < requestEndWithBuffer && bookingEnd > requestStartWithBuffer
    );
  });

  return !hasConflict;
};

const findAvailableRooms = (
  startTime: Date,
  data: MeetingRequestData,
  allRooms: Room[],
  existingBookings: Booking[]
): Room[] => {
  const timeToCheck =
    startTime instanceof Date ? startTime : new Date(startTime);

  const availableRooms = allRooms
    .filter((room) => {
      const hasCapacity = room.capacity >= data.attendees.length;

      const hasEquipment = hasRequiredEquipment(room, data.requiredEquipment);

      const isAvailable = isRoomAvailable(
        room,
        timeToCheck,
        data.duration,
        existingBookings
      );

      if (!hasCapacity) {
        console.log(
          `     Room ${room.name || room.id}: Insufficient capacity (${
            room.capacity
          } < ${data.attendees.length})`
        );
      }
      if (!hasEquipment && data.requiredEquipment.length > 0) {
        console.log(
          `    Room ${room.name || room.id}: Missing required equipment`
        );
      }
      if (!isAvailable) {
        console.log(
          `    Room ${
            room.name || room.id
          }: Not available at ${timeToCheck.toISOString()}`
        );
      }

      return hasCapacity && hasEquipment && isAvailable;
    })
    .sort((a, b) => {
      const capacityDiffA = a.capacity - data.attendees.length;
      const capacityDiffB = b.capacity - data.attendees.length;

      if (capacityDiffA !== capacityDiffB) {
        return capacityDiffA - capacityDiffB;
      }

      return a.hourlyRate - b.hourlyRate;
    });

  return availableRooms;
};

const generateTimeSlots = (
  preferredStart: Date,
  flexibility: number
): Date[] => {
  const timeSlots: Date[] = [];
  const interval = 15;

  const startDate =
    preferredStart instanceof Date ? preferredStart : new Date(preferredStart);

  const searchWindow = Math.max(flexibility, 60);
  const extendedSearchWindow = searchWindow + CLEANUP_BUFFER + 60;

  for (let i = interval; i <= extendedSearchWindow; i += interval) {
    timeSlots.push(addMinutes(startDate, -i));
  }

  timeSlots.unshift(new Date(startDate));

  for (let i = interval; i <= extendedSearchWindow; i += interval) {
    timeSlots.push(addMinutes(startDate, i));
  }

  console.log(
    `  ⏰ Generated ${timeSlots.length} time slots to check (${extendedSearchWindow}min window)`
  );
  return timeSlots;
};

const createMeetingRequest = async (data: MeetingRequestData) => {
  const attendeeCount = await prisma.user.count({
    where: { id: { in: data.attendees } },
  });

  if (attendeeCount !== data.attendees.length) {
    return {
      success: false,
      message: "Some attendees do not exist",
      invalidAttendees: data.attendees.length - attendeeCount,
    };
  }

  const request = await prisma.meetingRequest.create({
    data: {
      organizerId: data.organizerId,
      duration: data.duration,
      requiredEquipment: data.requiredEquipment,
      preferredStart: data.preferredStart,
      flexibility: data.flexibility,
      priority: data.priority,
      attendees: data.attendees,
      status: "pending",
    },
  });

  const allRooms = await prisma.room.findMany({
    include: {
      roomEquipment: {
        include: { equipment: true },
      },
    },
  });

  const existingBookings = await prisma.booking.findMany({
    where: { status: "confirmed" },
  });

  const preferredStartDate = new Date(data.preferredStart);
  const availableRoomsAtPreferredTime = findAvailableRooms(
    preferredStartDate,
    data,
    allRooms,
    existingBookings
  );

  if (availableRoomsAtPreferredTime.length > 0) {
    const bestRoom = availableRoomsAtPreferredTime[0];
    const startAt = preferredStartDate;
    const endAt = addMinutes(startAt, data.duration);

    const booking = await prisma.booking.create({
      data: {
        meetingRequestId: request.id,
        roomId: bestRoom.id,
        startAt,
        endAt,
        status: "confirmed",
      },
    });

    await prisma.bookingAttendee.createMany({
      data: data.attendees.map((userId) => ({
        bookingId: booking.id,
        userId,
      })),
    });

    await prisma.meetingRequest.update({
      where: { id: request.id },
      data: { status: "approved" },
    });

    return {
      success: true,
      message: "Meeting room booked successfully",
      booking: {
        id: booking.id,
        room: {
          id: bestRoom.id,
          name: bestRoom.name || `Room ${bestRoom.id.slice(-4)}`,
          capacity: bestRoom.capacity,
          location: bestRoom.location,
        },
        startAt,
        endAt,
        attendees: data.attendees.length,
      },
    };
  }

  const searchData: MeetingRequestData = {
    ...data,
    preferredStart: new Date(data.preferredStart),
  };

  const alternatives = findAlternativeOptions(
    searchData,
    allRooms,
    existingBookings
  );

  await prisma.meetingRequest.update({
    where: { id: request.id },
    data: { status: "pending" },
  });

  return {
    success: false,
    message: "No room available at preferred time. Please review alternatives.",
    alternatives,
    meetingRequest: {
      id: request.id,
      preferredStart: data.preferredStart,
      duration: data.duration,
      attendees: data.attendees.length,
    },
  };
};

const findAlternativeOptions = (
  data: MeetingRequestData,
  allRooms: Room[],
  existingBookings: Booking[]
): AlternativeOption[] => {
  const alternatives: AlternativeOption[] = [];
  const timeSlots = generateTimeSlots(data.preferredStart, data.flexibility);

  if (existingBookings.length > 0) {
    console.log(`  📌 Existing bookings:`);
    existingBookings.forEach((b, idx) => {
      const start = new Date(b.startAt);
      const end = new Date(b.endAt);
      addMinutes(start, -CLEANUP_BUFFER);
      addMinutes(end, CLEANUP_BUFFER);
    });
  }

  
  const maxRoomRate =
    allRooms.length > 0 ? Math.max(...allRooms.map((r) => r.hourlyRate)) : 0;

  let totalChecks = 0;
  let matchedRooms = 0;


  for (const timeSlot of timeSlots) {
    const timeStr = timeSlot.toISOString();
    const minutesFromPreferred = Math.round(
      (timeSlot.getTime() - data.preferredStart.getTime()) / (1000 * 60)
    );


    const availableRooms = findAvailableRooms(
      timeSlot,
      data,
      allRooms,
      existingBookings
    );

    totalChecks++;


    for (const room of availableRooms) {
      matchedRooms++;

      const timeShift = Math.abs(
        (timeSlot.getTime() - data.preferredStart.getTime()) / (1000 * 60)
      );

      const costSaved = ((maxRoomRate - room.hourlyRate) * data.duration) / 60;

      alternatives.push({
        roomId: room.id,
        roomName: room.name || `Room ${room.id.slice(-4)}`,
        capacity: room.capacity,
        hourlyRate: room.hourlyRate,
        location: room.location!,
        suggestedStart: timeSlot,
        suggestedEnd: addMinutes(timeSlot, data.duration),
        costSaved: Math.round(costSaved * 100) / 100,
        timeShift: Math.round(timeShift),
      });
    }
  }

 

  const sortedAlternatives = alternatives
    .sort((a, b) => {
      if (a.timeShift !== b.timeShift) {
        return a.timeShift - b.timeShift;
      }

      if (a.hourlyRate !== b.hourlyRate) {
        return a.hourlyRate - b.hourlyRate;
      }

      const capacityDiffA = a.capacity - data.attendees.length;
      const capacityDiffB = b.capacity - data.attendees.length;
      return capacityDiffA - capacityDiffB;
    })
    .slice(0, 10); 


  return sortedAlternatives;
};



const autoReleaseUnusedBookings = async () => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const result = await prisma.booking.updateMany({
    where: {
      startAt: { lte: tenMinutesAgo },
      checkedInAt: null,
      status: "confirmed",
    },
    data: { status: "cancelled" },
  });

  console.log(` Auto-released ${result.count} unused bookings`);

  return {
    released: result.count,
    timestamp: new Date(),
  };
};



const checkInBooking = async (bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return {
      success: false,
      message: "Booking not found",
    };
  }

  if (booking.status === "cancelled") {
    return {
      success: false,
      message: "Booking is already cancelled",
    };
  }

  if (booking.checkedInAt) {
    return {
      success: false,
      message: "Already checked in",
    };
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { checkedInAt: new Date() },
  });

  return {
    success: true,
    message: "Checked in successfully",
    checkedInAt: updated.checkedInAt,
  };
};



export const MeetingRequestService = {
  createMeetingRequest,
  autoReleaseUnusedBookings,
  checkInBooking,
};
