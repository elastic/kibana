/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * 00000000-0000-0000-0000-000000000000 is initial Elastic Agent id sent by Endpoint before policy is configured
 * 11111111-1111-1111-1111-111111111111 is Elastic Agent id sent by Endpoint when policy does not contain an id
 */
const IGNORED_ELASTIC_AGENT_IDS = [
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
];

export function buildBaseEndpointMetadataFilter(policyIds?: string[]): QueryDslQueryContainer {
  const filterIgnoredAgents = {
    must_not: { terms: { 'agent.id': IGNORED_ELASTIC_AGENT_IDS } },
  };

  const baseFilters: QueryDslQueryContainer[] = [
    // doc contains both agent and metadata
    { exists: { field: 'united.endpoint.agent.id' } },
    { exists: { field: 'united.agent.agent.id' } },
    // agent is enrolled
    {
      term: {
        'united.agent.active': {
          value: true,
        },
      },
    },
  ];

  // Only include policy filter if policyIds are explicitly provided
  if (policyIds) {
    baseFilters.push({
      terms: { 'united.agent.policy_id': uniq(policyIds) },
    });
  }

  const filterEndpointPolicyAgents = {
    filter: baseFilters,
  };

  return {
    bool: {
      ...filterIgnoredAgents,
      ...filterEndpointPolicyAgents,
    },
  };
}
