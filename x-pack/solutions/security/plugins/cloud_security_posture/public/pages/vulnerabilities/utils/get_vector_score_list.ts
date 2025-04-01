/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VectorScoreBase } from '@kbn/cloud-security-posture-common/schema/vulnerabilities/latest';
import { Vector } from '../types';

export const getVectorScoreList = (vectorBaseScore: VectorScoreBase) => {
  const result: Vector[] = [];
  const v2Vector = vectorBaseScore?.V2Vector;
  const v2Score = vectorBaseScore?.V2Score;
  const v3Vector = vectorBaseScore?.V3Vector;
  const v3Score = vectorBaseScore?.V3Score;

  if (v2Vector) {
    result.push({
      version: '2.0',
      vector: v2Vector,
      score: v2Score,
    });
  }

  if (v3Vector) {
    result.push({
      version: '3.0',
      vector: v3Vector,
      score: v3Score,
    });
  }

  return result;
};
