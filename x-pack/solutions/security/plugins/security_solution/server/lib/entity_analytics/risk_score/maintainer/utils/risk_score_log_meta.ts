/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMeta } from '@kbn/core/server';

/** Places typed scoring measurements in the structured log metadata. */
export const riskScoreLogMeta = <T extends object>(data: T): LogMeta & { risk_score: T } => ({
  risk_score: data,
});
