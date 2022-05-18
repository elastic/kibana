/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';

import { TransformAPIProvider } from '../../functional/services/transform/api';
import { TransformSecurityCommonProvider } from '../../functional/services/transform/security_common';
import { MachineLearningAPIProvider } from '../../functional/services/ml/api';
import { MachineLearningTestResourcesProvider } from '../../functional/services/ml/test_resources';

export function TransformProvider(context: FtrProviderContext) {
  const api = TransformAPIProvider(context);
  const mlApi = MachineLearningAPIProvider(context);
  const securityCommon = TransformSecurityCommonProvider(context);
  const testResources = MachineLearningTestResourcesProvider(context, mlApi);

  return {
    api,
    securityCommon,
    testResources,
  };
}
