/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID, NIGHTSHIFT_SETTINGS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import type { NightshiftSettingsLocatorParams } from '@kbn/nightshift-shared';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

export type NightshiftSettingsLocator = LocatorPublic<NightshiftSettingsLocatorParams>;

export class NightshiftSettingsLocatorDefinition
  implements LocatorDefinition<NightshiftSettingsLocatorParams>
{
  public readonly id = NIGHTSHIFT_SETTINGS_LOCATOR_ID;

  public readonly getLocation = async (params: NightshiftSettingsLocatorParams = {}) => ({
    app: NIGHTSHIFT_APP_ID,
    path: params.tab ? `/settings/${params.tab}` : '/settings',
    state: {},
  });
}
