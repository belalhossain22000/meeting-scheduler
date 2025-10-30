
import prisma from "../../../shared/prisma";

// Add an attendee to a booking
const addAttendee = async (bookingId: string, userId: string) => {
  const existing = await prisma.bookingAttendee.findFirst({
    where: { bookingId, userId },
  });
  if (existing) {
    throw new Error("User is already an attendee for this booking.");
  }

  const attendee = await prisma.bookingAttendee.create({
    data: { bookingId, userId },
  });
  return attendee;
};

// Get all attendees for a booking
async function getAttendees(bookingId: string) {
  const attendees = await prisma.bookingAttendee.findMany({
    where: { bookingId },
    include: { user: true },
  });
  return attendees;
}

// Remove an attendee
async function removeAttendee(attendeeId: string) {
  const existing = await prisma.bookingAttendee.findUnique({
    where: { id: attendeeId },
  });
  if (!existing) {
    throw new Error("Attendee not found.");
  }

  const attendee = await prisma.bookingAttendee.delete({
    where: { id: attendeeId },
  });
  return attendee;
}

export const BookingAttendeeService = {
  addAttendee,
  getAttendees,
  removeAttendee,
};
