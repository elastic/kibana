/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core/server';
import { PLAYGROUND_ENABLED_SETTING_ID } from '../common';

export const uiSettings: Record<string, UiSettingsParams<boolean>> = {
  [PLAYGROUND_ENABLED_SETTING_ID]: {
    name: i18n.translate('xpack.searchPlayground.uiSettings.enabled.name', {
      defaultMessage: 'Enable Playground',
    }),
    description: i18n.translate('xpack.searchPlayground.uiSettings.enabled.description', {
      defaultMessage:
        'Turn on Playground in this space. When off, Playground is removed from the navigation, its pages cannot be opened, and its API is unavailable.',
    }),
    value: false,
    type: 'boolean',
    category: ['search'],
    solutionViews: ['classic', 'es'],
    requiresPageReload: false,
    schema: schema.boolean(),
  },
};
