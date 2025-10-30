import { addMinutes } from "date-fns";
import prisma from "../../../shared/prisma";

const CLEANUP_BUFFER = 15; // minutes

// ============================================
// INTERFACES
// ============================================

interface MeetingRequestData {
  organizerId: string;
  duration: number;
  requiredEquipment: string[];
  preferredStart: Date;
  flexibility: number;
  priority: "low" | "normal" | "high" | "urgent";
  attendees: string[]; // Array of user IDs
}

interface Room {
  id: string;
  name?: string; // Make optional in case it doesn't exist
  capacity: number;
  hourlyRate: number;
  location?: string | null;
  roomEquipment: {
    id: string;
    equipmentId: string;
    equipment: { id: string; name: string } | null;
  }[];
}

interface Booking {
  id: string;
  roomId: string | null;
  startAt: Date;
  endAt: Date;
  status: "confirmed" | "cancelled";
}

interface AlternativeOption {
  roomId: string;
  roomName: string;
  capacity: number;
  hourlyRate: number;
  location?: string;
  suggestedStart: Date;
  suggestedEnd: Date;
  costSaved: number;
  timeShift: number; // minutes from preferred time
}

// ============================================
// HELPER: Check if room has required equipment
// ============================================

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

// ============================================
// HELPER: Check if room is available at given time
// ============================================

const isRoomAvailable = (
  room: Room,
  startTime: Date,
  duration: number,
  existingBookings: Booking[]
): boolean => {
  // Ensure startTime is a Date object
  const requestStart =
    startTime instanceof Date ? startTime : new Date(startTime);
  const requestEnd = addMinutes(requestStart, duration);
  const requestStartWithBuffer = addMinutes(requestStart, -CLEANUP_BUFFER);
  const requestEndWithBuffer = addMinutes(requestEnd, CLEANUP_BUFFER);

  const hasConflict = existingBookings.some((booking) => {
    if (!booking.roomId || booking.roomId !== room.id) return false;

    const bookingStart = new Date(booking.startAt);
    const bookingEnd = new Date(booking.endAt);

    // Check for overlap (including buffer)
    return (
      bookingStart < requestEndWithBuffer && bookingEnd > requestStartWithBuffer
    );
  });

  return !hasConflict;
};

// ============================================
// HELPER: Find available rooms at specific time
// ============================================

const findAvailableRooms = (
  startTime: Date,
  data: MeetingRequestData,
  allRooms: Room[],
  existingBookings: Booking[]
): Room[] => {
  // Ensure startTime is a Date object
  const timeToCheck =
    startTime instanceof Date ? startTime : new Date(startTime);

  const availableRooms = allRooms
    .filter((room) => {
      // Check capacity
      const hasCapacity = room.capacity >= data.attendees.length;

      // Check equipment
      const hasEquipment = hasRequiredEquipment(room, data.requiredEquipment);

      // Check availability
      const isAvailable = isRoomAvailable(
        room,
        timeToCheck,
        data.duration,
        existingBookings
      );

      // Debug logging for filtering (only show if not available)
      if (!hasCapacity) {
        console.log(
          `    ❌ Room ${room.name || room.id}: Insufficient capacity (${
            room.capacity
          } < ${data.attendees.length})`
        );
      }
      if (!hasEquipment && data.requiredEquipment.length > 0) {
        console.log(
          `    ❌ Room ${room.name || room.id}: Missing required equipment`
        );
      }
      if (!isAvailable) {
        console.log(
          `    ❌ Room ${
            room.name || room.id
          }: Not available at ${timeToCheck.toISOString()}`
        );
      }

      return hasCapacity && hasEquipment && isAvailable;
    })
    .sort((a, b) => {
      // Sort by capacity (prefer right-sized rooms)
      const capacityDiffA = a.capacity - data.attendees.length;
      const capacityDiffB = b.capacity - data.attendees.length;

      if (capacityDiffA !== capacityDiffB) {
        return capacityDiffA - capacityDiffB;
      }

      // Then by cost (prefer cheaper rooms)
      return a.hourlyRate - b.hourlyRate;
    });

  return availableRooms;
};

// ============================================
// HELPER: Generate time slots within flexibility window
// ============================================

const generateTimeSlots = (
  preferredStart: Date,
  flexibility: number
): Date[] => {
  const timeSlots: Date[] = [];
  const interval = 15; // Check every 15 minutes

  // Ensure preferredStart is a Date object
  const startDate =
    preferredStart instanceof Date ? preferredStart : new Date(preferredStart);

  // IMPORTANT: Expand search beyond flexibility to account for buffer times
  // If all rooms are booked, we need to check times that don't overlap with buffers
  const searchWindow = Math.max(flexibility, 60); // At least 1 hour window
  const extendedSearchWindow = searchWindow + CLEANUP_BUFFER + 60; // Add extra time for buffer

  // Try earlier times (in 15-min increments)
  for (let i = interval; i <= extendedSearchWindow; i += interval) {
    timeSlots.push(addMinutes(startDate, -i));
  }

  // Add preferred time (always check this first)
  timeSlots.unshift(new Date(startDate));

  // Try later times (in 15-min increments)
  for (let i = interval; i <= extendedSearchWindow; i += interval) {
    timeSlots.push(addMinutes(startDate, i));
  }

  console.log(
    `  ⏰ Generated ${timeSlots.length} time slots to check (${extendedSearchWindow}min window)`
  );
  return timeSlots;
};

// ============================================
// MAIN: Create Meeting Request
// ============================================

const createMeetingRequest = async (data: MeetingRequestData) => {
  console.log("\n🚀 Creating meeting request...");
  console.log("📋 Request details:", {
    duration: data.duration,
    attendees: data.attendees.length,
    equipment: data.requiredEquipment.length,
    preferredTime: data.preferredStart,
    flexibility: data.flexibility,
  });

  // Step 1: Validate attendees exist
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

  // Step 2: Save meeting request as pending
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

  console.log("✅ Meeting request created:", request.id);

  // Step 3: Load all rooms with equipment
  const allRooms = await prisma.room.findMany({
    include: {
      roomEquipment: {
        include: { equipment: true },
      },
    },
  });

  console.log(`📦 Total rooms: ${allRooms.length}`);

  // Step 4: Load existing confirmed bookings
  const existingBookings = await prisma.booking.findMany({
    where: { status: "confirmed" },
  });

  console.log(`📅 Existing bookings: ${existingBookings.length}`);

  // Step 5: Try to find room at preferred time
  const preferredStartDate = new Date(data.preferredStart);
  const availableRoomsAtPreferredTime = findAvailableRooms(
    preferredStartDate,
    data,
    allRooms,
    existingBookings
  );

  if (availableRoomsAtPreferredTime.length > 0) {
    // ✅ Room available at preferred time!
    const bestRoom = availableRoomsAtPreferredTime[0];
    const startAt = preferredStartDate;
    const endAt = addMinutes(startAt, data.duration);

    console.log(`✅ Found available room: ${bestRoom.name || bestRoom.id}`);

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        meetingRequestId: request.id,
        roomId: bestRoom.id,
        startAt,
        endAt,
        status: "confirmed",
      },
    });

    // Create booking attendees
    await prisma.bookingAttendee.createMany({
      data: data.attendees.map((userId) => ({
        bookingId: booking.id,
        userId,
      })),
    });

    // Update request status
    await prisma.meetingRequest.update({
      where: { id: request.id },
      data: { status: "approved" },
    });

    console.log("🎉 Booking confirmed!");

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

  // ❌ No room available at preferred time - find alternatives
  console.log("⚠️ No room available at preferred time");
  console.log("🔍 Searching for alternatives...");

  // Create data object with Date conversion to avoid serialization issues
  const searchData: MeetingRequestData = {
    ...data,
    preferredStart: new Date(data.preferredStart),
  };

  const alternatives = findAlternativeOptions(
    searchData,
    allRooms,
    existingBookings
  );

  console.log(`💡 Found ${alternatives.length} alternative options`);

  // Update meeting request to stay pending (no rejection)
  await prisma.meetingRequest.update({
    where: { id: request.id },
    data: { status: "pending" }, // Keep as pending for manual approval
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

// ============================================
// HELPER: Find Alternative Options
// ============================================

const findAlternativeOptions = (
  data: MeetingRequestData,
  allRooms: Room[],
  existingBookings: Booking[]
): AlternativeOption[] => {
  const alternatives: AlternativeOption[] = [];
  const timeSlots = generateTimeSlots(data.preferredStart, data.flexibility);

  console.log(`  🔍 Searching for alternatives...`);
  console.log(`  📋 Rooms available: ${allRooms.length}`);
  console.log(`  📅 Bookings to avoid: ${existingBookings.length}`);

  // Show booking details
  if (existingBookings.length > 0) {
    console.log(`  📌 Existing bookings:`);
    existingBookings.forEach((b, idx) => {
      const start = new Date(b.startAt);
      const end = new Date(b.endAt);
      const startWithBuffer = addMinutes(start, -CLEANUP_BUFFER);
      const endWithBuffer = addMinutes(end, CLEANUP_BUFFER);
      console.log(
        `     ${idx + 1}. Room ${b.roomId?.slice(
          -4
        )}: ${start.toISOString()} - ${end.toISOString()}`
      );
      console.log(
        `        (with buffer: ${startWithBuffer.toISOString()} - ${endWithBuffer.toISOString()})`
      );
    });
  }

  // Find the most expensive room for cost comparison
  const maxRoomRate =
    allRooms.length > 0 ? Math.max(...allRooms.map((r) => r.hourlyRate)) : 0;

  let totalChecks = 0;
  let matchedRooms = 0;

  console.log(`\n  🔎 Checking each time slot:\n`);

  for (const timeSlot of timeSlots) {
    const timeStr = timeSlot.toISOString();
    const minutesFromPreferred = Math.round(
      (timeSlot.getTime() - data.preferredStart.getTime()) / (1000 * 60)
    );

    console.log(
      `  ⏱️  Time: ${timeStr} (${
        minutesFromPreferred > 0 ? "+" : ""
      }${minutesFromPreferred} min)`
    );

    const availableRooms = findAvailableRooms(
      timeSlot,
      data,
      allRooms,
      existingBookings
    );

    totalChecks++;

    if (availableRooms.length > 0) {
      console.log(`     ✅ Found ${availableRooms.length} available room(s)`);
    } else {
      console.log(`     ❌ No rooms available`);
    }

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

  console.log(`\n  📊 Search Summary:`);
  console.log(`     Checked ${totalChecks} time slots`);
  console.log(`     Found ${matchedRooms} room-time combinations`);
  console.log(`     Total alternatives: ${alternatives.length}`);

  // Sort alternatives by best options first
  const sortedAlternatives = alternatives
    .sort((a, b) => {
      // 1. Prefer minimal time shift
      if (a.timeShift !== b.timeShift) {
        return a.timeShift - b.timeShift;
      }

      // 2. Prefer cheaper rooms
      if (a.hourlyRate !== b.hourlyRate) {
        return a.hourlyRate - b.hourlyRate;
      }

      // 3. Prefer right-sized rooms
      const capacityDiffA = a.capacity - data.attendees.length;
      const capacityDiffB = b.capacity - data.attendees.length;
      return capacityDiffA - capacityDiffB;
    })
    .slice(0, 10); // Return top 10 alternatives (increased from 5)

  if (sortedAlternatives.length > 0) {
    console.log(`\n  ✨ Top alternatives:`);
    sortedAlternatives.slice(0, 3).forEach((alt, idx) => {
      console.log(
        `     ${idx + 1}. ${
          alt.roomName
        } at ${alt.suggestedStart.toISOString()} (${alt.timeShift}min shift, ${
          alt.hourlyRate
        }/hr)`
      );
    });
  } else {
    console.log(
      `\n  ⚠️  No alternatives found. All rooms are booked in the search window.`
    );
    console.log(`     💡 Suggestions:`);
    console.log(`        - Try a different date`);
    console.log(`        - Increase flexibility window`);
    console.log(`        - Check if some bookings can be cancelled`);
  }

  return sortedAlternatives;
};

// ============================================
// AUTO-RELEASE: Unused Bookings
// ============================================

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

  console.log(`🔓 Auto-released ${result.count} unused bookings`);

  return {
    released: result.count,
    timestamp: new Date(),
  };
};

// ============================================
// CHECK-IN: Mark booking as checked-in
// ============================================

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

// ============================================
// EXPORTS
// ============================================

export const MeetingRequestService = {
  createMeetingRequest,
  autoReleaseUnusedBookings,
  checkInBooking,
};
