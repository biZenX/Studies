"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "./lang";
import { useToast } from "./toast";
import { useMounted, useToday } from "./useMediaQuery";
import { StudyModal, type StudyPayload } from "./StudyModal";
import { studyToForm } from "./StudyForm";
import { ExportModal } from "./ExportModal";
import {
  Modal,
  AppSelect,
  IconPlus,
  IconLayers,
  IconUsers,
  IconGlobe,
  IconMail,
  IconSearch,
  IconEdit,
  IconTrash,
  IconDownload,
  IconCalendar,
  StatusBadge,
  Spinner,
} from "./ui";
import type { StudyWithCount, Stats, Participant } from "@/lib/types";
import { formatDateRange, localizeStudy } from "@/lib/content";
import { filterAndSortStudies } from "@/domain/rosterEngine";
