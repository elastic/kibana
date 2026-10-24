/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  COLLAPSED_BY_DEFAULT_SECTION_IDS,
  type InvestigationSectionId,
} from '../hooks/use_investigation_sections';
import { useKibana } from '../hooks/use_kibana';

/**
 * The user's explicit toggles, kept across reloads. Sections the user never toggled are absent and
 * fall back to their default. Per space: the base path carries the space prefix (`/s/<space id>`).
 */
export const getSectionExpansionStorageKey = (basePath: string): string =>
  `nightshift.investigations.sectionsExpanded:${basePath || 'default'}`;

type ExpansionOverrides = Partial<Record<InvestigationSectionId, boolean>>;

export interface InvestigationSectionExpansion {
  isExpanded: (id: InvestigationSectionId) => boolean;
  toggle: (id: InvestigationSectionId) => void;
  expand: (id: InvestigationSectionId) => void;
}

const isSectionExpandedByDefault = (id: InvestigationSectionId): boolean =>
  !COLLAPSED_BY_DEFAULT_SECTION_IDS.has(id);

/** Anything but a plain object of booleans is treated as no overrides. */
const sanitizeOverrides = (value: unknown): ExpansionOverrides => {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(([, isExpanded]) => typeof isExpanded === 'boolean')
  );
};

/** Which sections are expanded, remembering the user's toggles in local storage. */
export const useInvestigationSectionExpansion = (): InvestigationSectionExpansion => {
  const { http } = useKibana().services;
  const [storedOverrides, setStoredOverrides] = useLocalStorage<ExpansionOverrides>(
    getSectionExpansionStorageKey(http.basePath.get()),
    {}
  );
  const overrides = useMemo(() => sanitizeOverrides(storedOverrides), [storedOverrides]);

  const isExpanded = useCallback(
    (id: InvestigationSectionId) => overrides[id] ?? isSectionExpandedByDefault(id),
    [overrides]
  );

  const setExpanded = useCallback(
    (id: InvestigationSectionId, expanded: boolean) => {
      setStoredOverrides({ ...overrides, [id]: expanded });
    },
    [overrides, setStoredOverrides]
  );

  const toggle = useCallback(
    (id: InvestigationSectionId) => setExpanded(id, !isExpanded(id)),
    [isExpanded, setExpanded]
  );

  const expand = useCallback(
    (id: InvestigationSectionId) => {
      if (!isExpanded(id)) {
        setExpanded(id, true);
      }
    },
    [isExpanded, setExpanded]
  );

  return useMemo(() => ({ isExpanded, toggle, expand }), [isExpanded, toggle, expand]);
};
