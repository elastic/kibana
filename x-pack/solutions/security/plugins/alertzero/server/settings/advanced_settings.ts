/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core/types';
import { ALERTZERO_ENABLED_SETTING } from '@kbn/alertzero-common';

const ALERTZERO_CATEGORY = 'alertzero';

/**
 * Advanced settings registered by the AlertZero plugin. `alertzero:enabled` is the
 * per-space source of truth for AlertZero enablement; the onboarding UI derives
 * every onboarding state from it, and the enable/disable routes mutate it via the
 * space-scoped uiSettings client *inside* the install/uninstall transaction.
 *
 * It is deliberately `readonlyMode: 'ui'`: enablement only means anything alongside the
 * installed workers, so flipping the boolean from Advanced Settings would desync the two
 * (off hides the app while workers keep running; on skips installation entirely). The
 * transactional routes write it server-side, which readonly does not block.
 */
export const alertzeroAdvancedSettings = {
  [ALERTZERO_ENABLED_SETTING]: {
    category: [ALERTZERO_CATEGORY],
    name: i18n.translate('xpack.alertzero.enabledSettingName', {
      defaultMessage: 'Enable AlertZero',
    }),
    type: 'boolean',
    value: false,
    description: i18n.translate('xpack.alertzero.enabledSettingDescription', {
      defaultMessage:
        'Enables AlertZero watches for this space. Turning it on installs the system watch workflows; turning it off removes them. Change this from AlertZero onboarding, not here.',
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
    readonly: true,
    readonlyMode: 'ui',
  },
} satisfies Record<string, UiSettingsParams<boolean>>;
