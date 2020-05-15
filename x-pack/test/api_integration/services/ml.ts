/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';

import {
  MachineLearningAPIProvider,
  MachineLearningSecurityCommonProvider,
  MachineLearningTestResourcesProvider,
} from '../../functional/services/machine_learning';

export function MachineLearningProvider(context: FtrProviderContext) {
  const api = MachineLearningAPIProvider(context);
  const securityCommon = MachineLearningSecurityCommonProvider(context);
  const testResources = MachineLearningTestResourcesProvider(context);

  return {
    api,
    securityCommon,
    testResources,
  };
}
