/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';

export interface ServiceOverviewParams extends SerializableRecord {
  serviceName: string;
  environment?: string;
  rangeFrom?: string;
  rangeTo?: string;
}

export type ServiceOverviewLocator = LocatorPublic<ServiceOverviewParams>;
export const SERVICE_OVERVIEW_LOCATOR_ID = 'serviceOverviewLocator';

export class ServiceOverviewLocatorDefinition implements LocatorDefinition<ServiceOverviewParams> {
  public readonly id = SERVICE_OVERVIEW_LOCATOR_ID;

  public readonly getLocation = async ({
    rangeFrom,
    rangeTo,
    serviceName,
    environment,
  }: ServiceOverviewParams) => {
    const params = { rangeFrom, rangeTo, environment };
    return {
      app: 'apm',
      path: `/services/${serviceName}/overview?${qs.stringify(params)}`,
      state: {},
    };
  };
}
