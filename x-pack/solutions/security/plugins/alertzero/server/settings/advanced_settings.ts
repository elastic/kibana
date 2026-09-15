/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the Elastic License 2.0 (ELv2)
 * or the Server Side Public License (SSPLv1) for more details.
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
 * space-scoped uiSettings client before installing or removing watch workflows.
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
        'Enables AlertZero watches for this space. Turning it on installs the system watch workflows; turning it off removes them.',
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
  },
} satisfies Record<string, UiSettingsParams<boolean>>;
