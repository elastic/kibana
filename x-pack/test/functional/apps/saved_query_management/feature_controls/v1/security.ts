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
    feature: 'discover',
    app: 'discover',
    hasImplicitSaveQueryManagement: true,
  },
  {
    feature: 'dashboard',
    app: 'dashboard',
    hasImplicitSaveQueryManagement: true,
  },
  {
    feature: 'maps',
    app: 'maps',
    hasImplicitSaveQueryManagement: true,
  },
  {
    feature: 'visualize',
    app: 'visualize',
    hasImplicitSaveQueryManagement: true,
  },
];

export default createSecurityTests(featureConfigs);
