/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core/server';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../common';

export function registerUiSettings(uiSettings: UiSettingsServiceSetup) {
  uiSettings.register({
    [FF_ENABLE_ENTITY_STORE_V2]: {
      name: 'Enable entity store v2',
      description: 'Switches the Entity Store Engine to v2',
      schema: schema.boolean(),
      value: false,
      requiresPageReload: false,
      readonly: true,
      readonlyMode: 'ui',
    },
  });
}
