/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreFields } from '../../../../../common/search_strategy';
import { getWatchlistJoin } from './helpers';

export const getWatchlistRiskLevelsQueryBody = (watchlistId: string, namespace: string) => `
| WHERE ${RiskScoreFields.userName} IS NOT NULL
${getWatchlistJoin(watchlistId, namespace)}
| STATS count = COUNT_DISTINCT(${RiskScoreFields.userName}) BY ${RiskScoreFields.userRisk}
| RENAME ${RiskScoreFields.userRisk} AS level`;
