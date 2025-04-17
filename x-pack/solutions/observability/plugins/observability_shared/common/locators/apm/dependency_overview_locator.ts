/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  DEPENDENCY_OVERVIEW_LOCATOR_ID,
  DependencyOverviewParams,
} from '@kbn/deeplinks-observability/locators';

export type DependencyOverviewLocator = LocatorPublic<DependencyOverviewParams>;

export class DependencyOverviewLocatorDefinition
  implements LocatorDefinition<DependencyOverviewParams>
{
  public readonly id = DEPENDENCY_OVERVIEW_LOCATOR_ID;

  public readonly getLocation = async ({
    rangeFrom,
    rangeTo,
    dependencyName,
    environment,
  }: DependencyOverviewParams) => {
    const params = { rangeFrom, rangeTo, environment, dependencyName };
    return {
      app: 'apm',
      path: `/dependencies/overview?${qs.stringify(params)}`,
      state: {},
    };
  };
}
