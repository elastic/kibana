/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pageObjects as xpackFunctionalPageObjects } from '../../functional/page_objects';
import { EndpointPageProvider } from './endpoint_page';
import { EndpointPolicyPageProvider } from './policy_page';
import { TrustedAppsPageProvider } from './trusted_apps_page';
import { EndpointPageUtils } from './page_utils';
import { IngestManagerCreatePackagePolicy } from './ingest_manager_create_package_policy_page';

export const pageObjects = {
  ...xpackFunctionalPageObjects,
  endpoint: EndpointPageProvider,
  policy: EndpointPolicyPageProvider,
  trustedApps: TrustedAppsPageProvider,
  endpointPageUtils: EndpointPageUtils,
  ingestManagerCreatePackagePolicy: IngestManagerCreatePackagePolicy,
};
