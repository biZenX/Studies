import type { Study, Participant } from "@/db/schema";

export type StudyWithCount = Study & { participantCount: number };

export type Stats = {
  studies: number;
  participants: number;
  countries: number;
  withEmail: number;
};

export type SendResult = {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
};

export type { Study, Participant };
