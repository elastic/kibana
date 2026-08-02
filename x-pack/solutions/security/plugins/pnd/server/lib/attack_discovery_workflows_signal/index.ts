/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING,
  PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER,
} from '../../../common/constants';
import type { PndStartServicesAccessor } from '../../types';
import { getScopedInternalUiSettingsClient } from '../scoped_internal_ui_settings_client';

/**
 * Resolve whether Attack Discovery 2.0 is enabled in the caller's space, reading the per-space
 * {@link ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING} Advanced Setting via the internal-user,
 * space-scoped uiSettings client (the same path `GET /internal/pnd/autonomy` uses).
 *
 * **Fail-open:** any failure resolving services or reading the setting returns `true`. A transient
 * uiSettings hiccup must never make a populated queue read as "AD 2.0 disabled" and suppress it —
 * the signal exists to *explain* an empty result, not to hide a non-empty one. This mirrors the
 * fail-closed-gate philosophy elsewhere in PND: when a control read fails, degrade toward showing
 * work, never toward silently swallowing it.
 */
export const isAttackDiscoveryWorkflowsEnabledForSpace = async ({
  getStartServices,
  logger,
  request,
  spaceId,
}: {
  getStartServices: PndStartServicesAccessor;
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
}): Promise<boolean> => {
  try {
    const [{ savedObjects, uiSettings }] = await getStartServices();
    const uiSettingsClient = getScopedInternalUiSettingsClient({
      savedObjects,
      spaceId,
      uiSettings,
    });

    // The Advanced Setting is a boolean; coerce defensively so the signal header is always a clean
    // `'true'` / `'false'` (an unset value reads as `false`).
    return Boolean(await uiSettingsClient.get<boolean>(ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING));
  } catch (error) {
    logger.debug(
      () =>
        `Failed to read "${ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING}" for space "${spaceId}"; assuming enabled: ${
          error instanceof Error ? error.message : String(error)
        }`
    );
    return true;
  }
};

/**
 * The response header carrying the AD-2.0-enabled signal, ready to spread into `response.ok`.
 */
export const buildAttackDiscoveryWorkflowsSignalHeaders = (
  enabled: boolean
): Record<string, string> => ({
  [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: String(enabled),
});
