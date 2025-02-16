/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PageObjects, ScoutPage, createLazyPageObject } from '@kbn/scout';
import { EntityAnalyticsPage } from './entity_analytics';

export interface SecurityPageObjects extends PageObjects {
  entityAnalyticsPage: EntityAnalyticsPage;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): SecurityPageObjects {
  return {
    ...pageObjects,
    entityAnalyticsPage: createLazyPageObject(EntityAnalyticsPage, page),
  };
}
