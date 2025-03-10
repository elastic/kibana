/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  uptimeOverviewLocatorID,
  type UptimeOverviewLocatorInfraParams,
  type UptimeOverviewLocatorParams,
} from '@kbn/deeplinks-observability';
import type { LocatorDefinition } from '@kbn/share-plugin/common';

export type { UptimeOverviewLocatorInfraParams, UptimeOverviewLocatorParams };

export class UptimeOverviewLocatorDefinition
  implements LocatorDefinition<UptimeOverviewLocatorInfraParams | UptimeOverviewLocatorParams>
{
  public readonly id = uptimeOverviewLocatorID;

  public readonly getLocation = async (
    params: UptimeOverviewLocatorInfraParams | UptimeOverviewLocatorParams
  ) => {
    const { getLocation } = await import('./get_location');
    return getLocation(params);
  };
}
