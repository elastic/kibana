/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { statusSchema } from '@kbn/slo-schema';
import type { OutputOf } from 'io-ts';

type Status = OutputOf<typeof statusSchema>;

export function isSloFailed(status: Status): boolean {
  return status === 'DEGRADING' || status === 'VIOLATED';
}

export function getSloChartState(status: Status): 'error' | 'success' {
  return isSloFailed(status) ? 'error' : 'success';
}
