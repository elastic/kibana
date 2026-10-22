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

/**
 * The user's explicit toggles, kept across reloads. Sections the user never toggled are absent and
 * fall back to their default. The preference is a browser-level one, so it is not keyed by space.
 */
export const SECTION_EXPANSION_STORAGE_KEY = 'nightshift.investigations.sectionsExpanded';

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
  const [storedOverrides, setStoredOverrides] = useLocalStorage<ExpansionOverrides>(
    SECTION_EXPANSION_STORAGE_KEY,
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
