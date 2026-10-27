/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { INFRA_ENTITIES_INVENTORY_EXPERIENCE_KEY } from '../common/ui_settings_keys';

export type EntityInventoryAppServerSetup = Record<string, never>;

export class EntityInventoryAppPlugin implements Plugin {
  setup(core: CoreSetup): EntityInventoryAppServerSetup {
    core.uiSettings.register({
      [INFRA_ENTITIES_INVENTORY_EXPERIENCE_KEY]: {
        name: i18n.translate('xpack.entityInventoryApp.uiSettings.experienceName', {
          defaultMessage: 'Infrastructure entities inventory experience',
        }),
        value: false,
        description: i18n.translate('xpack.entityInventoryApp.uiSettings.experienceDescription', {
          defaultMessage: 'Enables the entity-based infrastructure inventory experience.',
        }),
        schema: schema.boolean(),
        category: ['observability'],
      },
    });
    return {};
  }

  start(_core: CoreStart): void {}
}
