/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureApp, FeatureName, createSecurityTests } from '../create_security_tests';

const featureConfigs: Array<{
  feature: FeatureName;
  app: FeatureApp;
  hasImplicitSaveQueryManagement: boolean;
}> = [
  {
    feature: 'discover_v2',
    app: 'discover',
    hasImplicitSaveQueryManagement: false,
  },
  {
    feature: 'dashboard_v2',
    app: 'dashboard',
    hasImplicitSaveQueryManagement: false,
  },
  {
    feature: 'maps_v2',
    app: 'maps',
    hasImplicitSaveQueryManagement: false,
  },
  {
    feature: 'visualize_v2',
    app: 'visualize',
    hasImplicitSaveQueryManagement: false,
  },
];

export default createSecurityTests(featureConfigs);
