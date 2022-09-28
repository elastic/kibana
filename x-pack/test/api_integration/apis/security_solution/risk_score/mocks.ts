/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const creatIndexOptions = {
  index: 'test',
  mappings: {
    properties: {
      'host.name': {
        type: 'keyword',
      },
      '@timestamp': {
        type: 'date',
      },
      ingest_timestamp: {
        type: 'date',
      },
      risk: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      risk_stats: {
        properties: {
          risk_score: {
            type: 'float',
          },
        },
      },
    },
  },
};

export const creatLegacyHostRiskScorePiovtTransformIndexOptions = {
  index: 'ml_host_risk_score_default',
  mappings: {
    properties: {
      'host.name': {
        type: 'keyword',
      },
      '@timestamp': {
        type: 'date',
      },
      ingest_timestamp: {
        type: 'date',
      },
      risk: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      risk_stats: {
        properties: {
          risk_score: {
            type: 'float',
          },
        },
      },
    },
  },
};

export const creatLegacyHostRiskScoreLatestTransformIndexOptions = {
  index: 'ml_host_risk_score_latest_default',
  mappings: {
    properties: {
      'host.name': {
        type: 'keyword',
      },
      '@timestamp': {
        type: 'date',
      },
      ingest_timestamp: {
        type: 'date',
      },
      risk: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      risk_stats: {
        properties: {
          risk_score: {
            type: 'float',
          },
        },
      },
    },
  },
};

export const creatLegacyUserRiskScorePiovtTransformIndexOptions = {
  index: 'ml_user_risk_score_default',
  mappings: {
    properties: {
      host: {
        properties: {
          name: { type: 'keyword' },
          risk: {
            properties: {
              calculated_score_norm: { type: 'float' },
              calculated_level: { type: 'keyword' },
              multipliers: { type: 'keyword' },
              rule_risks: {
                properties: {
                  rule_name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                  rule_risk: { type: 'float' },
                  rule_id: { type: 'keyword' },
                },
              },
            },
          },
        },
      },
      ingest_timestamp: { type: 'date' },
      '@timestamp': { type: 'date' },
    },
  },
};

export const creatLegacyUserRiskScoreLatestTransformIndexOptions = {
  index: 'ml_user_risk_score_latest_default',
  mappings: {
    properties: {
      'user.name': {
        type: 'keyword',
      },
      '@timestamp': {
        type: 'date',
      },
      ingest_timestamp: {
        type: 'date',
      },
      risk: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      risk_stats: {
        properties: {
          risk_score: {
            type: 'float',
          },
        },
      },
    },
  },
};

export const createStoredScriptsOptions = {
  id: 'ml_hostriskscore_levels_script',
  script: {
    lang: 'painless',
    source:
      "double risk_score = (def)ctx.getByPath(params.risk_score);\nif (risk_score < 20) {\n    ctx['host']['risk']['calculated_level'] = 'Unknown'\n}\nelse if (risk_score >= 20 && risk_score < 40) {\n    ctx['host']['risk']['calculated_level'] = 'Low'\n}\nelse if (risk_score >= 40 && risk_score < 70) {\n    ctx['host']['risk']['calculated_level'] = 'Moderate'\n}\nelse if (risk_score >= 70 && risk_score < 90) {\n    ctx['host']['risk']['calculated_level'] = 'High'\n}\nelse if (risk_score >= 90) {\n    ctx['host']['risk']['calculated_level'] = 'Critical'\n}",
  },
};

export const legacyHostRiskScoreSavedObjects = [
  'Saved object [index-pattern/ml-host-risk-score-default-index-pattern] not found',
  'Saved object [lens/d3f72670-d3a0-11eb-bd37-7bb50422e346] not found',
  'Saved object [index-pattern/alerts-default-index-pattern] not found',
  'Saved object [visualization/42371d00-cf7a-11eb-9a96-05d89f94ad96] not found',
  'Saved object [visualization/a62d3ed0-cf92-11eb-a0ff-1763d16cbda7] not found',
  'Saved object [visualization/b2dbc9b0-cf94-11eb-bd37-7bb50422e346] not found',
  'Saved object [tag/1d00ebe0-f3b2-11eb-beb2-b91666445a94] not found',
  'Saved object [dashboard/6f05c8c0-cf77-11eb-9a96-05d89f94ad96] not found',
  'Saved object [index-pattern/ml-host-risk-score-latest-default-index-pattern] not found',
  'Saved object [lens/dc289c10-d4ff-11eb-a0ff-1763d16cbda7] not found',
  'Saved object [dashboard/27b483b0-d500-11eb-a0ff-1763d16cbda7] not found',
];

export const legacyUserRiskScoreSavedObjects = [
  'Saved object [index-pattern/ml-user-risk-score-latest-default-index-pattern] not found',
  'Saved object [lens/54dadd60-1a57-11ed-bb53-ad8c26f4d942] not found',
  'Saved object [index-pattern/ml-user-risk-score-default-index-pattern] not found',
  'Saved object [lens/60454070-9a5d-11ec-9633-5f782d122340] not found',
  'Saved object [index-pattern/alerts-default-index-pattern] not found',
  'Saved object [visualization/a62d3ed0-cf92-11eb-a0ff-1763d16cbda7] not found',
  'Saved object [visualization/42371d00-cf7a-11eb-9a96-05d89f94ad96] not found',
  'Saved object [visualization/183d32f0-9a5e-11ec-90d3-1109ed409ab5] not found',
  'Saved object [tag/93fc0f00-1a57-11ed-bb53-ad8c26f4d942] not found',
  'Saved object [dashboard/1355b030-ca2b-11ec-962f-a3a018b7d10f] not found',
  'Saved object [dashboard/8ac3ad30-1a57-11ed-bb53-ad8c26f4d942] not found',
];
