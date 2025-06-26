/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatMatchRuleCreateProps } from '../../../../../common/api/detection_engine';

export const basicThreatMatchRule: ThreatMatchRuleCreateProps = {
  type: 'threat_match',
  name: 'Basic threat match rule',
  description: 'Basic threat match rule',
  severity: 'low',
  risk_score: 21,
  query: '*',
  index: ['test'],
  threat_query: '*',
  threat_index: ['threat_test'],
  threat_mapping: [
    {
      entries: [
        {
          field: 'host.name',
          value: 'host.name',
          type: 'mapping',
        },
      ],
    },
  ],
};

export const generateThreatMatchRuleData = () => {};
