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
          'Enable AlertZero for this space. AlertZero is the agentic SecOps layer that does the work and returns proposals, while a person still reviews them.',
      }),
      type: 'boolean',
      value: false,
      scope: 'namespace',
      category: [SECURITY_SOLUTION_CATEGORY],
      solutionViews: ['security'],
      experimental: true,
      // Nothing this setting gates needs a reload any more: the app status updates live and routes
      // check it per request. The investigation template UI, which used to need the reload, is now
      // registered by agenticInvestigations regardless of this setting. The prompt is kept so moving
      // that UI does not change how the setting behaves.
      requiresPageReload: true,
      schema: schema.boolean(),
    },
  });
};
