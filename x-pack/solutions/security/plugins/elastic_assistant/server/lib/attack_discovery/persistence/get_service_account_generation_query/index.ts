/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ATTACK_DISCOVERY_EVENT_SERVICE_ACCOUNT_TAG } from '@kbn/discoveries';

import { ATTACK_DISCOVERY_EVENT_PROVIDER } from '../../../../../common/constants';

/**
 * Returns an Elasticsearch query that matches the events of a generation written by a service
 * account (e.g. an AlertZero Worker) in the space
 */
export const getServiceAccountGenerationQuery = ({
  eventLogIndex,
  executionUuid,
  spaceId,
}: {
  eventLogIndex: string;
  executionUuid: string;
  spaceId: string;
}): estypes.SearchRequest => ({
  allow_no_indices: true,
  ignore_unavailable: true,
  index: [eventLogIndex],
  query: {
    bool: {
      filter: [
        { term: { 'event.provider': ATTACK_DISCOVERY_EVENT_PROVIDER } },
        { term: { 'kibana.alert.rule.execution.uuid': executionUuid } },
        { term: { 'kibana.space_ids': spaceId } },
        { term: { tags: ATTACK_DISCOVERY_EVENT_SERVICE_ACCOUNT_TAG } },
      ],
    },
  },
  size: 0,
  terminate_after: 1,
  track_total_hits: true,
});
