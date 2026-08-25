/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { RiskEngineMetrics } from './types';

export const riskEngineMetricsSchema: MakeSchemaFrom<RiskEngineMetrics> = {
  unique_user_risk_score_total: {
    type: 'long',
    _meta: {
      description: 'Total unique user risk scores',
    },
  },
  unique_host_risk_score_total: {
    type: 'long',
    _meta: {
      description: 'Total unique host risk scores',
    },
  },
  unique_user_risk_score_day: {
    type: 'long',
    _meta: {
      description: 'Unique user risk scores per day',
    },
  },
  unique_host_risk_score_day: {
    type: 'long',
    _meta: {
      description: 'Unique host risk scores per day',
    },
  },
  all_host_risk_scores_total: {
    type: 'long',
    _meta: {
      description: 'Total number of host risk score records',
    },
  },
  all_user_risk_scores_total: {
    type: 'long',
    _meta: {
      description: 'Total number of user risk score records',
    },
  },
  all_host_risk_scores_total_day: {
    type: 'long',
    _meta: {
      description: 'Number of host risk score records per day',
    },
  },
  all_user_risk_scores_total_day: {
    type: 'long',
    _meta: {
      description: 'Number of user risk score records per day',
    },
  },
  all_risk_scores_index_size: {
    type: 'long',
    _meta: {
      description: 'Total size of the all Risk Score indices (MB)',
    },
  },
  unique_risk_scores_index_size: {
    type: 'long',
    _meta: {
      description: 'Total size of the unique Risk Score indices (MB)',
    },
  },
};
