/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineNoMlNodesOnStartupTests } from '@kbn/test-suites-xpack-platform/serverless/api_integration/test_suites/ml/no_ml_nodes_on_startup';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  defineNoMlNodesOnStartupTests(getService('es'));
}
