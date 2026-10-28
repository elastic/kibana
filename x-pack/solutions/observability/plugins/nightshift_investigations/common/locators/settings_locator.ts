/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID, NIGHTSHIFT_SETTINGS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';

export interface NightshiftSettingsLocatorParams extends SerializableRecord {
  tab?: 'general' | 'investigations' | 'detections';
}

export type NightshiftSettingsLocator = LocatorPublic<NightshiftSettingsLocatorParams>;

/** Server-side copy of the locator the `nightshift` plugin registers in the browser, with the same id. */
export class NightshiftSettingsLocatorDefinition
  implements LocatorDefinition<NightshiftSettingsLocatorParams>
{
  public readonly id = NIGHTSHIFT_SETTINGS_LOCATOR_ID;

  public readonly getLocation = async ({ tab }: NightshiftSettingsLocatorParams = {}) => ({
    app: NIGHTSHIFT_APP_ID,
    path: tab ? `/settings/${tab}` : '/settings',
    state: {},
  });
}
