/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '@kbn/evals';
import { assertAlertZeroContracts } from '../src/contracts';
evaluate.describe(
  'AlertZero Endpoint Analysis L0 contracts',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('registered production contracts', async () => assertAlertZeroContracts());
  }
);
