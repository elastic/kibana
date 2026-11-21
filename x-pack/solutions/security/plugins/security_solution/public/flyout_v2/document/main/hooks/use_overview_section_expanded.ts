/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { USER_SETTINGS_KEYS } from '../../../../../common/user_settings/keys';
import { useUserSetting } from '../../../../common/user_settings/use_user_setting';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';

type SectionsState = Record<string, boolean>;

const EMPTY_SECTIONS: SectionsState = {};

export interface UseOverviewSectionExpandedParams {
  /** Section id (matches the keys used by the legacy localStorage map). */
  sectionId: string;
  defaultValue: boolean;
}

/**
 * POC: expanded/collapsed state of a document flyout overview section, persisted per user.
 *
 * All sections share one User Storage key (a map of section id -> expanded), because keys must be
 * registered up front and section ids are not a fixed list. The setter merges into the latest map
 * (pending or cached) so two quick toggles do not overwrite each other.
 */
export const useOverviewSectionExpanded = ({
  sectionId,
  defaultValue,
}: UseOverviewSectionExpandedParams): [boolean, (expanded: boolean) => void] => {
  const [sections, setSections] = useUserSetting<SectionsState>(
    USER_SETTINGS_KEYS.FLYOUT_OVERVIEW_SECTIONS,
    EMPTY_SECTIONS,
    { legacyLocalStorageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS }
  );

  const id = sectionId.toLowerCase();
  const stored = sections[id];

  const setExpanded = useCallback(
    (expanded: boolean) => {
      setSections((previous) => ({ ...previous, [id]: expanded }));
    },
    [id, setSections]
  );

  return [stored ?? defaultValue, setExpanded];
};
