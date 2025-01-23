/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  ERROR_GROUP_DETAILS_LOCATOR,
  type ErrorGroupDetailsLocatorParams,
} from '@kbn/deeplinks-observability';

export { ERROR_GROUP_DETAILS_LOCATOR, type ErrorGroupDetailsLocatorParams };

export type ErrorGroupDetailsLocator = LocatorPublic<ErrorGroupDetailsLocatorParams>;

export class ErrorGroupDetailsLocatorDefinition
  implements LocatorDefinition<ErrorGroupDetailsLocatorParams>
{
  public readonly id = ERROR_GROUP_DETAILS_LOCATOR;

  public readonly getLocation = async ({
    rangeFrom,
    rangeTo,
    serviceName,
    errorGroupId,
  }: ErrorGroupDetailsLocatorParams) => {
    const params = { rangeFrom, rangeTo, serviceName };
    return {
      app: 'apm',
      path: `/link-to/error_group/${encodeURIComponent(errorGroupId)}?${qs.stringify(params)}`,
      state: {},
    };
  };
}
