// Booking.interface: Module file for the Booking.interface functionality.
// Fetch bookings function
export interface GetBookingsFilters {
  organizerId?: string;
  roomId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: "confirmed" | "cancelled";
}