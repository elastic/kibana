/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pageObjects as xpackFunctionalPageObjects } from '../../functional/page_objects';
import { EndpointPageProvider } from './endpoint_page';
import { EndpointAlertsPageProvider } from './endpoint_alerts_page';
import { EndpointPolicyPageProvider } from './policy_page';
import { EndpointPageUtils } from './page_utils';

export const pageObjects = {
  ...xpackFunctionalPageObjects,
  endpoint: EndpointPageProvider,
  policy: EndpointPolicyPageProvider,
  endpointPageUtils: EndpointPageUtils,
  endpointAlerts: EndpointAlertsPageProvider,
};
