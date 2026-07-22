/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { FORENSIC_CASES } from './dataset';
import type { ForensicExample } from './types';

export const evaluate = base.extend<
  {},
  {
    forensicCases: ForensicExample[];
  }
>({
  forensicCases: [
    async (_fixtures, use) => {
      await use(FORENSIC_CASES);
    },
    { scope: 'worker' },
  ],
});
