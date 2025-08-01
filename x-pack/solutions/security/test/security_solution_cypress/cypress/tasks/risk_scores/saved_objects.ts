/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEntity } from './common';

const HOST_RISK_SCORE = 'Host Risk Score';
const USER_RISK_SCORE = 'User Risk Score';

const getRiskScore = (riskScoreEntity: RiskScoreEntity) =>
  riskScoreEntity === RiskScoreEntity.user ? USER_RISK_SCORE : HOST_RISK_SCORE;

export const getRiskScoreTagName = (riskScoreEntity: RiskScoreEntity, spaceId = 'default') =>
  `${getRiskScore(riskScoreEntity)} ${spaceId}`;
