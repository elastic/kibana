/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VectorScoreBase } from '@kbn/cloud-security-posture-common/schema/vulnerabilities/latest';

export type Vendor = 'NVD' | 'Red Hat' | 'GHSA';

export interface CVSScoreProps {
  vectorBaseScore: VectorScoreBase;
  vendor: string;
}

export interface Vector {
  version: string;
  vector: string;
  score: number | undefined;
}
