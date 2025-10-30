// MeetingRequest.interface: Module file for the MeetingRequest.interface functionality.
export type UserRole = "CEO" | "admin" | "employee";
export type MeetingPriority = "low" | "normal" | "high" | "urgent";
export type BookingStatus = "confirmed" | "cancelled";
export type MeetingRequestStatus = "pending" | "approved" | "rejected";

export interface MeetingRequestData {
  organizerId: string;
  duration: number; // in minutes
  requiredEquipment: string[];
  preferredStart: Date;
  flexibility: number; // minutes
  priority: MeetingPriority;
  attendeeCount: number;
}

export interface Room {
  id: string;
  capacity: number;
  hourlyRate: number;
  roomEquipment: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    roomId: string;
    equipmentId: string;
    equipment: {
      id: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  }[];
}



export interface Booking {
  id: string;
  meetingRequestId: string;
  roomId: string;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
}
