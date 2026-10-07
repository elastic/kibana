/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';

export type RulesCreatedTriggerGate = () => Promise<boolean>;

interface CreateRulesCreatedTriggerGateParams {
  /** The optional alertzero plugin's soft-enable switch; missing or disabled means off. */
  alertZero: { isEnabled: boolean } | undefined;
  /** Scoped to the request, so the setting is the one of the request's space. */
  uiSettingsClient: Pick<IUiSettingsClient, 'get'>;
  logger?: Logger;
}

/**
 * Decides whether `detectionRulesCreated` is emitted for a request: only while AlertZero is enabled
 * in the request's space. The trigger's only consumer is AlertZero, and rule creation (installing
 * every prebuilt rule, importing, duplicating) is a bulk operation on every deployment, so a
 * deployment that does not use AlertZero should pay nothing for it, not even a subscriber lookup.
 *
 * The plugin check is static. The space setting is served from the UI settings client's shared
 * per-space cache, so reading it does not hit Elasticsearch in steady state. A failed read counts
 * as off: the gate must never fail a rule creation.
 */
export const createRulesCreatedTriggerGate =
  ({
    alertZero,
    uiSettingsClient,
    logger,
  }: CreateRulesCreatedTriggerGateParams): RulesCreatedTriggerGate =>
  async () => {
    if (alertZero?.isEnabled !== true) return false;

    try {
      return (await uiSettingsClient.get<boolean>(ALERTZERO_ENABLED_SETTING_ID)) === true;
    } catch (err) {
      logger?.warn(
        `Could not read the AlertZero setting, not emitting detectionRulesCreated: ${err}`
      );
      return false;
    }
  };
