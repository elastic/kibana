/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_RISK_SCORE_URL } from '../risk_score/constants';

/**
 * Risk Impact Analysis routes
 */
export const RISK_IMPACT_URL = `${INTERNAL_RISK_SCORE_URL}/impact` as const;
