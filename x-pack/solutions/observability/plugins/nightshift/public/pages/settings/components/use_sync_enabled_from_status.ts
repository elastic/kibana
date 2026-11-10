/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';

/**
 * Reconcile a settings hook's local `enabled` flag with the live value from
 * maintenance status (after pause/resume).
 *
 * WHY write uiSettings: the browser uiSettings client caches values; writing
 * keeps later local reads aligned with the server-driven pause/resume toggle
 * without waiting for a full page reload.
 *
 * Dirty drafts: when the user has already toggled `enabled` locally (draft
 * differs from saved), only `saved` is synced so an unsaved edit is not
 * clobbered by the next status poll.
 */
export const useSyncEnabledFromStatus = <T extends { enabled: boolean }>({
  client,
  settingId,
  enabledFromStatus,
  setSaved,
  setDraft,
}: {
  client: IUiSettingsClient;
  settingId: string;
  enabledFromStatus: boolean | undefined;
  setSaved: Dispatch<SetStateAction<T>>;
  setDraft: Dispatch<SetStateAction<T>>;
}): void => {
  useEffect(() => {
    if (enabledFromStatus === undefined) {
      return;
    }

    let savedEnabledBefore = false;
    setSaved((previous) => {
      savedEnabledBefore = previous.enabled;
      return previous.enabled === enabledFromStatus
        ? previous
        : { ...previous, enabled: enabledFromStatus };
    });
    setDraft((previous) => {
      const draftDirtyOnEnabled = previous.enabled !== savedEnabledBefore;
      if (draftDirtyOnEnabled) {
        return previous;
      }
      return previous.enabled === enabledFromStatus
        ? previous
        : { ...previous, enabled: enabledFromStatus };
    });

    void client.set(settingId, enabledFromStatus).catch(() => {
      // Best-effort cache sync; Save still goes through the settings HTTP route.
    });
  }, [enabledFromStatus, client, settingId, setSaved, setDraft]);
};
