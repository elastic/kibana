/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { runEvaluations } from '@kbn/observability-ai-assistant-app-plugin/scripts/evaluation/evaluation';
import { RCAKibanaClient } from './kibana_client';

runEvaluations({
  testDirectory: Path.join(__dirname, './scenarios/**/*.spec.ts'),
  kbnClient: RCAKibanaClient,
});
