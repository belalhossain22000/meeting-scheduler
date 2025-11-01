export interface MeetingRequestData {
  organizerId: string;
  duration: number;
  requiredEquipment: string[];
  preferredStart: Date;
  flexibility: number;
  priority: "low" | "normal" | "high" | "urgent";
  attendees: string[]; // Array of user IDs
}

export interface Room {
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

export interface Booking {
  id: string;
  roomId: string | null;
  startAt: Date;
  endAt: Date;
  status: "confirmed" | "cancelled";
}

export interface AlternativeOption {
  roomId: string;
  roomName: string;
  capacity: number;
  hourlyRate: number;
  location?: string;
  suggestedStart: Date;
  suggestedEnd: Date;
  costSaved: number;
  timeShift: number;
}
