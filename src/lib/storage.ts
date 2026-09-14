import { DEFAULT_STUDY, DEFAULT_PARTICIPANTS } from "./seed-data";
import type { Study, Participant, StudyWithCount, Stats } from "./types";

const STUDIES_KEY = "studies_app_studies_v2";
const PARTICIPANTS_KEY = "studies_app_participants_v2";
const SYNC_EVENT = "studies_storage_updated";

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  }
  listeners.forEach((fn) => fn());
}

export function subscribeStorage(callback: Listener): () => void {
  listeners.add(callback);
  const handleCustomEvent = () => callback();
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STUDIES_KEY || e.key === PARTICIPANTS_KEY) {
      callback();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener(SYNC_EVENT, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener(SYNC_EVENT, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

function loadFromLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveToLocal<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn("Error saving to localStorage:", err);
  }
}

export function initializeLocalStorage(): {
  studies: Study[];
  participants: Participant[];
} {
  let storedStudies = loadFromLocal<Study[]>(STUDIES_KEY);
  let storedParticipants = loadFromLocal<Participant[]>(PARTICIPANTS_KEY);

  if (!storedStudies || storedStudies.length === 0) {
    const initialStudy: Study = {
      id: 1,
      title: DEFAULT_STUDY.title,
      year: DEFAULT_STUDY.year,
      description: DEFAULT_STUDY.description,
      status: DEFAULT_STUDY.status,
      createdAt: new Date(),
    };

    const initialParticipantsList: Participant[] = DEFAULT_PARTICIPANTS.map(
      ([name, country], idx) => ({
        id: idx + 1,
        studyId: 1,
        name,
        federation: country,
        country,
        email: null,
        phone: null,
        createdAt: new Date(),
      })
    );

    storedStudies = [initialStudy];
    storedParticipants = initialParticipantsList;

    saveToLocal(STUDIES_KEY, storedStudies);
    saveToLocal(PARTICIPANTS_KEY, storedParticipants);
  } else if (!storedParticipants) {
    storedParticipants = [];
    saveToLocal(PARTICIPANTS_KEY, storedParticipants);
  }

  return { studies: storedStudies, participants: storedParticipants };
}

export function getLocalDashboardData(): {
  studies: StudyWithCount[];
  stats: Stats;
} {
  const { studies, participants } = initializeLocalStorage();

  const countMap = new Map<number, number>();
  const countries = new Set<string>();
  let withEmail = 0;

  for (const p of participants) {
    countMap.set(p.studyId, (countMap.get(p.studyId) ?? 0) + 1);
    if (p.country) countries.add(p.country);
    if (p.email) withEmail += 1;
  }

  const studiesWithCount: StudyWithCount[] = studies.map((s) => ({
    ...s,
    participantCount: countMap.get(s.id) ?? 0,
  }));

  return {
    studies: studiesWithCount,
    stats: {
      studies: studies.length,
      participants: participants.length,
      countries: countries.size,
      withEmail,
    },
  };
}

export function getLocalStudyDetail(id: number): {
  study: StudyWithCount | null;
  participants: Participant[];
} {
  const { studies, participants } = initializeLocalStorage();
  const study = studies.find((s) => s.id === id);
  if (!study) {
    return { study: null, participants: [] };
  }

  const studyParticipants = participants.filter((p) => p.studyId === id);

  return {
    study: {
      ...study,
      participantCount: studyParticipants.length,
    },
    participants: studyParticipants,
  };
}

export function saveLocalStudy(data: {
  id?: number;
  title: string;
  year: string;
  description?: string | null;
  status?: string;
}): Study {
  const { studies } = initializeLocalStorage();
  let savedStudy: Study;

  if (data.id) {
    const idx = studies.findIndex((s) => s.id === data.id);
    if (idx >= 0) {
      savedStudy = {
        ...studies[idx],
        title: data.title,
        year: data.year,
        description: data.description ?? null,
        status: data.status ?? studies[idx].status,
      };
      studies[idx] = savedStudy;
    } else {
      savedStudy = {
        id: data.id,
        title: data.title,
        year: data.year,
        description: data.description ?? null,
        status: data.status ?? "active",
        createdAt: new Date(),
      };
      studies.unshift(savedStudy);
    }
  } else {
    const nextId = studies.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    savedStudy = {
      id: nextId,
      title: data.title,
      year: data.year,
      description: data.description ?? null,
      status: data.status ?? "active",
      createdAt: new Date(),
    };
    studies.unshift(savedStudy);
  }

  saveToLocal(STUDIES_KEY, studies);
  notifyListeners();

  // Secondary sync with API in background
  syncStudyWithServer(savedStudy).catch(() => {});

  return savedStudy;
}

export function deleteLocalStudy(id: number) {
  const { studies, participants } = initializeLocalStorage();
  const filteredStudies = studies.filter((s) => s.id !== id);
  const filteredParticipants = participants.filter((p) => p.studyId !== id);

  saveToLocal(STUDIES_KEY, filteredStudies);
  saveToLocal(PARTICIPANTS_KEY, filteredParticipants);
  notifyListeners();

  // Secondary sync
  fetch(`/api/studies/${id}`, { method: "DELETE" }).catch(() => {});
}

export function saveLocalParticipant(
  studyId: number,
  data: {
    id?: number;
    name: string;
    federation?: string | null;
    country?: string | null;
    email?: string | null;
    phone?: string | null;
  }
): Participant {
  const { participants } = initializeLocalStorage();
  let saved: Participant;

  if (data.id) {
    const idx = participants.findIndex((p) => p.id === data.id);
    if (idx >= 0) {
      saved = {
        ...participants[idx],
        name: data.name,
        federation: data.federation ?? null,
        country: data.country ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
      };
      participants[idx] = saved;
    } else {
      saved = {
        id: data.id,
        studyId,
        name: data.name,
        federation: data.federation ?? null,
        country: data.country ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        createdAt: new Date(),
      };
      participants.push(saved);
    }
  } else {
    const nextId = participants.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    saved = {
      id: nextId,
      studyId,
      name: data.name,
      federation: data.federation ?? null,
      country: data.country ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      createdAt: new Date(),
    };
    participants.push(saved);
  }

  saveToLocal(PARTICIPANTS_KEY, participants);
  notifyListeners();

  // Secondary sync
  syncParticipantWithServer(studyId, saved).catch(() => {});

  return saved;
}

export function bulkAddLocalParticipants(
  studyId: number,
  newRows: Array<{
    name: string;
    federation?: string | null;
    country?: string | null;
    email?: string | null;
    phone?: string | null;
  }>
): Participant[] {
  const { participants } = initializeLocalStorage();
  let currentMaxId = participants.reduce((max, p) => Math.max(max, p.id), 0);

  const createdList: Participant[] = [];

  for (const row of newRows) {
    if (!row.name || !row.name.trim()) continue;
    currentMaxId += 1;
    const p: Participant = {
      id: currentMaxId,
      studyId,
      name: row.name.trim(),
      federation: row.federation?.trim() || null,
      country: row.country?.trim() || null,
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      createdAt: new Date(),
    };
    createdList.push(p);
    participants.push(p);
  }

  saveToLocal(PARTICIPANTS_KEY, participants);
  notifyListeners();

  // Secondary background sync
  for (const p of createdList) {
    syncParticipantWithServer(studyId, p).catch(() => {});
  }

  return createdList;
}

export function deleteLocalParticipant(id: number) {
  const { participants } = initializeLocalStorage();
  const updated = participants.filter((p) => p.id !== id);
  saveToLocal(PARTICIPANTS_KEY, updated);
  notifyListeners();

  // Secondary sync
  fetch(`/api/participants/${id}`, { method: "DELETE" }).catch(() => {});
}

async function syncStudyWithServer(study: Study) {
  try {
    await fetch(`/api/studies/${study.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: study.title,
        year: study.year,
        description: study.description,
        status: study.status,
      }),
    });
  } catch {
    // Ignored in offline mode
  }
}

async function syncParticipantWithServer(studyId: number, p: Participant) {
  try {
    await fetch(`/api/studies/${studyId}/participants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: p.name,
        federation: p.federation,
        country: p.country,
        email: p.email,
        phone: p.phone,
      }),
    });
  } catch {
    // Ignored in offline mode
  }
}
