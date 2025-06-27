/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SerializableRecord } from '@kbn/utility-types';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

export type InfraDashboardLocator = LocatorPublic<InfraDashboardLocatorParams>;

export interface InfraDashboardLocatorParams extends SerializableRecord {
  relativePath: string;
}

export const INFRA_DASHBOARD_LOCATOR_ID = 'INFRA_DASHBOARD_LOCATOR_ID';

export class InfraDashboardLocatorDefinition
  implements LocatorDefinition<InfraDashboardLocatorParams>
{
  public readonly id = INFRA_DASHBOARD_LOCATOR_ID;

  public readonly getLocation = async (
    params: InfraDashboardLocatorParams & { state?: SerializableRecord }
  ) => {
    return {
      app: 'metrics',
      path: `/entity/${params.relativePath}`,
      state: params.state ? params.state : {},
    };
  };
}
