/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreFields } from '../../../../../../common/search_strategy';

export const RISK_LEVELS_PRIVILEGED_USERS_QUERY_BODY = `
| WHERE ${RiskScoreFields.userName} IS NOT NULL
| RENAME ${RiskScoreFields.timestamp} AS event_timestamp
| LOOKUP JOIN privileged-users ON ${RiskScoreFields.userName}
| RENAME event_timestamp AS ${RiskScoreFields.timestamp}
| EVAL is_privileged = COALESCE(labels.is_privileged, false)
| WHERE is_privileged == true
| STATS count = COUNT_DISTINCT(${RiskScoreFields.userName}) BY ${RiskScoreFields.userRisk}
| RENAME ${RiskScoreFields.userRisk} AS level`;

export const RISK_LEVELS_PRIVILEGED_USERS_QUERY_ID = 'risk_levels_privileged_users';

export const DONUT_CHART_HEIGHT = 160;
