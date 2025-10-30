// Booking.service: Module file for the Booking.service functionality.

import { addMinutes } from "date-fns";
import prisma from "../../../shared/prisma";
import { GetBookingsFilters } from "./Booking.interface";

const confirmBookingFromSuggestion = async (data: {
  meetingRequestId: string;
  roomId: string;
  startAt: Date;
  duration: number;
}) => {
  const endAt = addMinutes(data.startAt, data.duration);

  const booking = await prisma.booking.create({
    data: {
      meetingRequestId: data.meetingRequestId,
      roomId: data.roomId,
      startAt: data.startAt,
      endAt,
      status: "confirmed",
    },
  });

  await prisma.meetingRequest.update({
    where: { id: data.meetingRequestId },
    data: {
      status: "approved",
    },
  });

  return booking;
};

const getBookings = async (filters: GetBookingsFilters = {}) => {
  const bookings = await prisma.booking.findMany({
    where: {
      roomId: filters.roomId,
      status: filters.status,
      startAt:
        filters.startDate && filters.endDate
          ? { gte: filters.startDate, lte: filters.endDate }
          : undefined,
      meetingRequest: filters.organizerId
        ? { organizerId: filters.organizerId }
        : undefined,
    },
    include: {
      meetingRequest: true,
      room: true,
      attendees: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { startAt: "desc" },
  });

  return bookings;
};

export const BookingService = {
  confirmBookingFromSuggestion,
  getBookings,
};

// //// 1️⃣ Get all confirmed bookings
// const allBookings = await BookingService.getBookings({ status: "confirmed" });

// // 2️⃣ Get bookings for a specific user (organizer)
// const userBookings = await BookingService.getBookings({ organizerId: "user123" });

// // 3️⃣ Get bookings in a date range
// const today = new Date();
// const nextWeek = new Date();
// nextWeek.setDate(today.getDate() + 7);

// const weeklyBookings = await BookingService.getBookings({
//   startDate: today,
//   endDate: nextWeek,
// });

// // 4️⃣ Get bookings for a specific room
// const roomBookings = await BookingService.getBookings({ roomId: "room123" });