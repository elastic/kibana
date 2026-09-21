/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';

/** Advanced Settings category, mirroring Security Solution's own `APP_ID`-keyed settings. */
const SECURITY_SOLUTION_CATEGORY = 'securitySolution';

/**
 * Registers the per-space setting that gates the AlertZero app, its Security navigation nodes, and
 * its internal API. Registration is namespace-scoped so AlertZero can be turned on space by space.
 */
export const registerUiSettings = (uiSettings: UiSettingsServiceSetup): void => {
  uiSettings.register({
    [ALERTZERO_ENABLED_SETTING_ID]: {
      name: i18n.translate('xpack.alertzero.uiSettings.enableAlertZero.name', {
        defaultMessage: 'AlertZero',
      }),
      description: i18n.translate('xpack.alertzero.uiSettings.enableAlertZero.description', {
        defaultMessage:
          'Enable AlertZero for this space. When enabled, the AlertZero app, its Security navigation entries, and its internal APIs become available. Has no effect when AlertZero is disabled at the deployment level.',
      }),
      type: 'boolean',
      value: false,
      scope: 'namespace',
      category: [SECURITY_SOLUTION_CATEGORY],
      solutionViews: ['classic', 'security'],
      experimental: true,
      requiresPageReload: false,
      schema: schema.boolean(),
    },
  });
};
