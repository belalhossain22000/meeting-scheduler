import { addMinutes } from "date-fns";
import prisma from "../../../shared/prisma";
import { Booking, MeetingRequestData, Room } from "./MeetingRequest.interface";

const CLEANUP_BUFFER = 15;

const createMeetingRequest = async (data: any) => {
  // Step 1: Save request as pending
  const request = await prisma.meetingRequest.create({
    data: {
      organizerId: data.organizerId,
      duration: data.duration,
      requiredEquipment: data.requiredEquipment,
      preferredStart: data.preferredStart,
      flexibility: data.flexibility,
      priority: data.priority,
      attendeeCount: data.attendeeCount,
      status: "pending",
    },
  });

  // Step 2: Load all rooms and existing bookings
  const rooms = await prisma.room.findMany({
    include: { roomEquipment: { include: { equipment: true } } },
  });

  const existingBookings = await prisma.booking.findMany({
    where: {
      startAt: {
        lte: addMinutes(data.preferredStart, data.duration + CLEANUP_BUFFER),
      },
      endAt: { gte: addMinutes(data.preferredStart, -CLEANUP_BUFFER) },
      status: "confirmed",
    },
  });

  // Step 3: Find best-fit available room (right-size + cheapest)
  const candidateRooms = rooms
    .filter((room) => {
      const roomEquipments = room.roomEquipment.map((re) => re.equipment?.name);
      const hasRequiredEquipment = data.requiredEquipment.every((r: any) =>
        roomEquipments.includes(r)
      );
      const isBooked = existingBookings.some(
        (b) =>
          b.roomId === room.id &&
          b.startAt <
            addMinutes(data.preferredStart, data.duration + CLEANUP_BUFFER) &&
          b.endAt > addMinutes(data.preferredStart, -CLEANUP_BUFFER)
      );
      return (
        hasRequiredEquipment && room.capacity >= data.attendeeCount && !isBooked
      );
    })
    .sort((a, b) => a.capacity - b.capacity || a.hourlyRate - b.hourlyRate);

  const bestRoom = candidateRooms[0];

  if (bestRoom) {
    // Step 4: Create Booking
    const startAt = data.preferredStart;
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

    await prisma.meetingRequest.update({
      where: { id: request.id },
      data: { status: "approved" },
    });

    return { success: true, message: "Booking confirmed", booking };
  }

  // Step 5: Suggest alternatives if no room available
  const alternatives = await suggestAlternativeTimes(
    data,
    rooms,
    existingBookings
  );

  return {
    success: false,
    message: "No room available at preferred time",
    alternatives,
    meetingRequest: request,
  };
};

const suggestAlternativeTimes = (
  data: any,
  rooms: Room[],
  existingBookings: any
) => {
  const suggestions: any[] = [];
  const startTimes = [
    addMinutes(data.preferredStart, -data.flexibility),
    addMinutes(data.preferredStart, data.flexibility),
  ];

  for (const time of startTimes) {
    for (const room of rooms) {
      const roomEquipments = room.roomEquipment.map((re) => re.equipment?.name);
      const hasRequiredEquipment = data.requiredEquipment.every((r: any) =>
        roomEquipments.includes(r)
      );

      const isBooked = existingBookings.some(
        (b: any) =>
          b.roomId === room.id &&
          b.startAt < addMinutes(time, data.duration + CLEANUP_BUFFER) &&
          b.endAt > addMinutes(time, -CLEANUP_BUFFER)
      );

      if (
        hasRequiredEquipment &&
        room.capacity >= data.attendeeCount &&
        !isBooked
      ) {
        suggestions.push({
          roomId: room.id,
          suggestedStart: time,
          suggestedEnd: addMinutes(time, data.duration),
        });
      }
    }
  }

  return suggestions;
};

// Auto-release bookings not checked-in after 10 minutes
const autoReleaseUnusedBookings = async () => {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.booking.updateMany({
    where: {
      startAt: { lte: cutoff },
      checkedInAt: null,
      status: "confirmed",
    },
    data: { status: "cancelled" },
  });
};

export const MeetingRequestService = {
  createMeetingRequest,
  suggestAlternativeTimes,
  autoReleaseUnusedBookings,
  
};
