/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsParams } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { PND_SPACE_ENABLED_SETTING_ID } from '../common/constants';

export const pndUiSettings: Record<string, UiSettingsParams<boolean>> = {
  [PND_SPACE_ENABLED_SETTING_ID]: {
    category: ['securitySolution'],
    description: i18n.translate('xpack.pnd.uiSettings.spaceEnabledDescription', {
      defaultMessage:
        'Installs built-in PND watches in this space. Disabling this setting removes their per-space workflow documents and resets their settings.',
    }),
    name: i18n.translate('xpack.pnd.uiSettings.spaceEnabledName', {
      defaultMessage: 'Enable PND watches in this space',
    }),
    requiresPageReload: true,
    schema: schema.boolean(),
    solutionViews: ['classic', 'security'],
    value: false,
  },
};
