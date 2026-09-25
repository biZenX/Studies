import { DEFAULT_STUDY, DEFAULT_PARTICIPANTS } from "./seed-data";
import type { Study, Participant, StudyWithCount, Stats } from "./types";
import { computeGlobalStats } from "@/domain/rosterEngine";

const STUDIES_KEY = "studies_app_studies_v3";
const PARTICIPANTS_KEY = "studies_app_participants_v3";
const SEEDED_KEY = "studies_app_seeded_v3";
const LEGACY_KEYS = [
  "studies_app_studies_v2",
  "studies_app_participants_v2",
  "studies_app_studies",
  "studies_app_participants",
];
const SYNC_EVENT = "studies_storage_updated";

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  }
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn("Storage listener failed:", err);
    }
  });
}

export function subscribeStorage(callback: Listener): () => void {
  listeners.add(callback);
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STUDIES_KEY || e.key === PARTICIPANTS_KEY) callback();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

function getSafeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadFromLocal<T>(key: string): T | null {
  try {
    const storage = getSafeStorage();
    if (!storage) return null;
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveToLocal<T>(key: string, data: T): boolean {
  try {
    const storage = getSafeStorage();
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn("Error saving to localStorage:", err);
    try {
      const storage = getSafeStorage();
      if (!storage) return false;
      const slim = Array.isArray(data)
        ? data.map((row: any) => {
            const { createdAt, ...rest } = row ?? {};
            return rest;
          })
        : data;
      storage.setItem(key, JSON.stringify(slim));
      return true;
    } catch {
      return false;
    }
  }
}

const memory: { studies: Study[] | null; participants: Participant[] | null } = {
  studies: null,
  participants: null,
};

function hydrateStudy(row: any): Study {
  return {
    id: Number(row?.id) || 0,
    title: String(row?.title ?? ""),
    year: String(row?.year ?? ""),
    endDate: row?.endDate ? String(row.endDate) : null,
    description: row?.description ?? null,
    status: String(row?.status ?? "active"),
    titleEn: row?.titleEn ?? null,
    descriptionEn: row?.descriptionEn ?? null,
    createdAt: row?.createdAt ? new Date(row.createdAt) : new Date(),
  } as Study;
}

function hydrateParticipant(row: any): Participant {
  return {
    id: Number(row?.id) || 0,
    studyId: Number(row?.studyId) || 1,
    name: String(row?.name ?? ""),
    federation: row?.federation ?? null,
    country: row?.country ?? null,
    email: row?.email ?? null,
    phone: row?.phone ?? null,
    code: row?.code ?? null,
    createdAt: row?.createdAt ? new Date(row.createdAt) : new Date(),
  } as Participant;
}

function readLegacy<T>(current: T | null, legacyKey: string): T | null {
  if (current) return current;
  return loadFromLocal<T>(legacyKey);
}

export function initializeLocalStorage(): {
  studies: Study[];
  participants: Participant[];
} {
  if (typeof window === "undefined") {
    return { studies: [], participants: [] };
  }
  if (memory.studies && memory.participants) {
    return { studies: memory.studies, participants: memory.participants };
  }

  let storedStudies = readLegacy(loadFromLocal<any[]>(STUDIES_KEY), LEGACY_KEYS[0]);
  let storedParticipants = readLegacy(
    loadFromLocal<any[]>(PARTICIPANTS_KEY),
    LEGACY_KEYS[1],
  );

  const storage = getSafeStorage();
  const alreadySeeded = storage?.getItem(SEEDED_KEY) === "1";

  if (!alreadySeeded && (!storedStudies || storedStudies.length === 0)) {
    storedStudies = [
      {
        id: 1,
        title: DEFAULT_STUDY.title,
        year: DEFAULT_STUDY.year,
        endDate: DEFAULT_STUDY.endDate,
        description: DEFAULT_STUDY.description,
        status: DEFAULT_STUDY.status,
        titleEn: DEFAULT_STUDY.titleEn,
        descriptionEn: DEFAULT_STUDY.descriptionEn,
        createdAt: new Date(),
      },
    ];
    storedParticipants = DEFAULT_PARTICIPANTS.map(([name, country], idx) => ({
      id: idx + 1,
      studyId: 1,
      name,
      federation: country,
      country,
      email: null,
      phone: null,
      code: null,
      createdAt: new Date(),
    }));
  }

  const studies = (storedStudies ?? []).map(hydrateStudy).filter((s) => s.id);
  const participants = (storedParticipants ?? [])
    .map(hydrateParticipant)
    .filter((p) => p.id && p.name);

  memory.studies = studies;
  memory.participants = participants;
  invalidateSnapshots();
  saveToLocal(STUDIES_KEY, studies);
  saveToLocal(PARTICIPANTS_KEY, participants);
  try {
    storage?.setItem(SEEDED_KEY, "1");
    LEGACY_KEYS.forEach((k) => storage?.removeItem(k));
  } catch {
    /* ignore */
  }
  return { studies, participants };
}

type DashboardSnapshot = { studies: StudyWithCount[]; stats: Stats };
type DetailSnapshot = { study: StudyWithCount | null; participants: Participant[] };

const EMPTY_PARTICIPANTS: Participant[] = [];
let dashboardSnapshot: DashboardSnapshot | null = null;
const detailSnapshots = new Map<number, DetailSnapshot>();

function invalidateSnapshots() {
  dashboardSnapshot = null;
  detailSnapshots.clear();
}

export function getDashboardSnapshot(): DashboardSnapshot {
  if (typeof window === "undefined") {
    return { studies: [], stats: { studies: 0, participants: 0, countries: 0, withEmail: 0 } };
  }
  if (!dashboardSnapshot) dashboardSnapshot = getLocalDashboardData();
  return dashboardSnapshot;
}

export function getStudySnapshot(id: number): DetailSnapshot {
  if (typeof window === "undefined") {
    return { study: null, participants: EMPTY_PARTICIPANTS };
  }
  let snapshot = detailSnapshots.get(id);
  if (!snapshot) {
    snapshot = getLocalStudyDetail(id);
    detailSnapshots.set(id, snapshot);
  }
  return snapshot;
}

function persist() {
  invalidateSnapshots();
  const studies = memory.studies ?? [];
  const participants = memory.participants ?? [];
  const okStudies = saveToLocal(STUDIES_KEY, studies);
  const okParticipants = saveToLocal(PARTICIPANTS_KEY, participants);
  return okStudies && okParticipants;
}

export function getLocalDashboardData(): {
  studies: StudyWithCount[];
  stats: Stats;
} {
  const { studies, participants } = initializeLocalStorage();
  const countMap = new Map<number, number>();
  for (let i = 0; i < participants.length; i++) {
    const sid = participants[i].studyId;
    countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
  }
  const studiesWithCount: StudyWithCount[] = studies.map((s) => ({
    ...s,
    participantCount: countMap.get(s.id) ?? 0,
  }));
  return {
    studies: studiesWithCount,
    stats: computeGlobalStats(studiesWithCount, participants),
  };
}

export function getLocalStudyDetail(id: number): {
  study: StudyWithCount | null;
  participants: Participant[];
} {
  const { studies, participants } = initializeLocalStorage();
  const study = studies.find((s) => s.id === id);
  if (!study) return { study: null, participants: [] };
  const studyParticipants = participants.filter((p) => p.studyId === id);
  return {
    study: { ...study, participantCount: studyParticipants.length },
    participants: studyParticipants,
  };
}

export function saveLocalStudy(data: {
  id?: number;
  title: string;
  year: string;
  endDate?: string | null;
  description?: string | null;
  status?: string;
  titleEn?: string | null;
  descriptionEn?: string | null;
}): Study {
  const { studies } = initializeLocalStorage();
  let savedStudy: Study;
  const endDate = data.endDate ? String(data.endDate) : null;

  if (data.id) {
    const idx = studies.findIndex((s) => s.id === data.id);
    if (idx >= 0) {
      savedStudy = {
        ...studies[idx],
        title: data.title,
        year: data.year,
        endDate: data.endDate === undefined ? (studies[idx].endDate ?? null) : endDate,
        description: data.description ?? null,
        status: data.status ?? studies[idx].status,
        titleEn: data.titleEn ?? studies[idx].titleEn ?? null,
        descriptionEn: data.descriptionEn ?? studies[idx].descriptionEn ?? null,
      };
      studies[idx] = savedStudy;
    } else {
      savedStudy = hydrateStudy({
        id: data.id,
        title: data.title,
        year: data.year,
        endDate,
        description: data.description ?? null,
        status: data.status ?? "active",
        titleEn: data.titleEn ?? null,
        descriptionEn: data.descriptionEn ?? null,
        createdAt: new Date(),
      });
      studies.unshift(savedStudy);
    }
  } else {
    const nextId = studies.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    savedStudy = hydrateStudy({
      id: nextId,
      title: data.title,
      year: data.year,
      endDate,
      description: data.description ?? null,
      status: data.status ?? "active",
      titleEn: data.titleEn ?? null,
      descriptionEn: data.descriptionEn ?? null,
      createdAt: new Date(),
    });
    studies.unshift(savedStudy);
  }

  memory.studies = studies;
  persist();
  notifyListeners();
  syncStudyWithServer(savedStudy).catch(() => {});
  return savedStudy;
}

export function deleteLocalStudy(id: number) {
  const { studies, participants } = initializeLocalStorage();
  memory.studies = studies.filter((s) => s.id !== id);
  memory.participants = participants.filter((p) => p.studyId !== id);
  persist();
  notifyListeners();
  syncDeleteWithServer(`/api/studies/${id}`).catch(() => {});
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
    code?: string | null;
  },
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
        code: data.code ?? participants[idx].code ?? null,
      };
      participants[idx] = saved;
    } else {
      saved = hydrateParticipant({ ...data, studyId, id: data.id });
      participants.push(saved);
    }
  } else {
    const nextId = participants.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    saved = hydrateParticipant({ ...data, studyId, id: nextId });
    participants.push(saved);
  }

  memory.participants = participants;
  persist();
  notifyListeners();
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
    code?: string | null;
  }>,
  options: { skipDuplicates?: boolean } = {},
): Participant[] {
  const { participants } = initializeLocalStorage();
  let currentMaxId = participants.reduce((max, p) => Math.max(max, p.id), 0);
  const existing = new Set(
    options.skipDuplicates
      ? participants
          .filter((p) => p.studyId === studyId)
          .map((p) => p.name.trim().replace(/\s+/g, " ").toLowerCase())
      : [],
  );
  const createdList: Participant[] = [];
  for (const row of newRows) {
    const name = (row.name ?? "").trim();
    if (!name) continue;
    const key = name.replace(/\s+/g, " ").toLowerCase();
    if (options.skipDuplicates && existing.has(key)) continue;
    if (options.skipDuplicates) existing.add(key);
    currentMaxId += 1;
    const p = hydrateParticipant({
      id: currentMaxId,
      studyId,
      name,
      federation: row.federation?.trim() || null,
      country: row.country?.trim() || null,
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      code: row.code?.trim() || null,
      createdAt: new Date(),
    });
    createdList.push(p);
    participants.push(p);
  }
  memory.participants = participants;
  persist();
  notifyListeners();
  for (const p of createdList) {
    syncParticipantWithServer(studyId, p).catch(() => {});
  }
  return createdList;
}

export function deleteLocalParticipant(id: number): Participant | null {
  const { participants } = initializeLocalStorage();
  const removed = participants.find((p) => p.id === id) ?? null;
  memory.participants = participants.filter((p) => p.id !== id);
  persist();
  notifyListeners();
  syncDeleteWithServer(`/api/participants/${id}`).catch(() => {});
  return removed;
}

export function restoreLocalParticipant(participant: Participant) {
  const { participants } = initializeLocalStorage();
  if (participants.some((p) => p.id === participant.id)) return;
  participants.push(participant);
  participants.sort((a, b) => a.id - b.id);
  memory.participants = participants;
  persist();
  notifyListeners();
  syncParticipantWithServer(participant.studyId, participant).catch(() => {});
}

/* Cloud + local sync */
let serverSyncState: "unknown" | "on" | "off" = "unknown";
let pullInFlight: Promise<boolean> | null = null;
let lastPullAt = 0;

async function serverSyncEnabled(): Promise<boolean> {
  if (serverSyncState !== "unknown") return serverSyncState === "on";
  try {
    const res = await fetch("/api/health", { method: "GET", cache: "no-store" });
    const data = await res.json().catch(() => null);
    serverSyncState = res.ok && data?.ok ? "on" : "off";
  } catch {
    serverSyncState = "off";
  }
  return serverSyncState === "on";
}

/** Pull cloud roster (or push local if cloud empty). Multi-device source of truth. */
export async function pullFromCloud(force = false): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!force && Date.now() - lastPullAt < 15_000) return serverSyncState === "on";
  if (pullInFlight) return pullInFlight;

  pullInFlight = (async () => {
    try {
      if (!(await serverSyncEnabled())) return false;
      const res = await fetch("/api/sync", { method: "GET", cache: "no-store" });
      if (!res.ok) {
        serverSyncState = "off";
        return false;
      }
      const data = await res.json().catch(() => null);
      if (!data?.ok || !Array.isArray(data.studies)) return false;

      const cloudStudies = (data.studies as any[]).map(hydrateStudy).filter((s) => s.id);
      const cloudParticipants = (Array.isArray(data.participants) ? data.participants : [])
        .map(hydrateParticipant)
        .filter((p) => p.id && p.name);

      if (cloudStudies.length > 0) {
        memory.studies = cloudStudies;
        memory.participants = cloudParticipants;
        invalidateSnapshots();
        saveToLocal(STUDIES_KEY, cloudStudies);
        saveToLocal(PARTICIPANTS_KEY, cloudParticipants);
        try {
          getSafeStorage()?.setItem(SEEDED_KEY, "1");
        } catch {
          /* ignore */
        }
        lastPullAt = Date.now();
        notifyListeners();
        return true;
      }

      const local = initializeLocalStorage();
      if (local.studies.length > 0) {
        for (const s of local.studies) await syncStudyWithServer(s);
        for (const p of local.participants) await syncParticipantWithServer(p.studyId, p);
        lastPullAt = Date.now();
        return true;
      }

      lastPullAt = Date.now();
      return true;
    } catch {
      return false;
    } finally {
      pullInFlight = null;
    }
  })();

  return pullInFlight;
}

async function syncDeleteWithServer(url: string) {
  if (!(await serverSyncEnabled())) return;
  try {
    await fetch(url, { method: "DELETE" });
  } catch {
    /* offline */
  }
}

async function syncStudyWithServer(study: Study) {
  if (!(await serverSyncEnabled())) return;
  const payload = {
    title: study.title,
    year: study.year,
    endDate: study.endDate ?? null,
    description: study.description,
    status: study.status,
    titleEn: study.titleEn,
    descriptionEn: study.descriptionEn,
  };
  try {
    const res = await fetch(`/api/studies/${study.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
    await fetch("/api/studies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    /* offline */
  }
}

async function syncParticipantWithServer(studyId: number, p: Participant) {
  if (!(await serverSyncEnabled())) return;
  try {
    await fetch(`/api/studies/${studyId}/participants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: p.id,
        name: p.name,
        federation: p.federation,
        country: p.country,
        email: p.email,
        phone: p.phone,
        code: p.code,
      }),
    });
  } catch {
    /* offline */
  }
}
