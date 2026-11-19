/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, SecurityPageObjects } from '@kbn/scout-security';
import { createLazyPageObject } from '@kbn/scout-security';
import { AlertResponsePage } from './alert_response';

export interface EdrRealFleetPageObjects extends SecurityPageObjects {
  alertResponse: AlertResponsePage;
}

export const extendPageObjects = (
  pageObjects: SecurityPageObjects,
  page: ScoutPage
): EdrRealFleetPageObjects => ({
  ...pageObjects,
  alertResponse: createLazyPageObject(AlertResponsePage, page),
});
