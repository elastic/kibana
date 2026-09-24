/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SignificantEventsUserPrivileges } from '../../../common';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators';
import { DETECTIONS_DATA_STREAM } from '../significant_events/detections';
import { EVENTS_DATA_STREAM } from '../significant_events/events';

const FULL_ACCESS: SignificantEventsUserPrivileges = {
  knowledgeIndicators: { read: true, write: true },
  significantEvents: { read: true, write: true },
};

export interface GetUserPrivilegesArgs {
  /** Must be the current-user client so the check reflects the requester. */
  esClient: ElasticsearchClient;
  isSecurityEnabled: boolean;
}

/**
 * Resolves the requesting user's read/write access to the plugin's data streams.
 * Short-circuits when security is disabled: every request then runs as the internal
 * user, which Elasticsearch reports as fully privileged.
 */
export const getSignificantEventsUserPrivileges = async ({
  esClient,
  isSecurityEnabled,
}: GetUserPrivilegesArgs): Promise<SignificantEventsUserPrivileges> => {
  if (!isSecurityEnabled) {
    return FULL_ACCESS;
  }

  const response = await esClient.security.hasPrivileges({
    index: [
      { names: [KNOWLEDGE_INDICATORS_DATA_STREAM], privileges: ['read', 'write'] },
      { names: [DETECTIONS_DATA_STREAM], privileges: ['read', 'write'] },
      { names: [EVENTS_DATA_STREAM], privileges: ['read'] },
    ],
  });

  const index = response.index ?? {};
  const granted = (name: string, privilege: string): boolean => index[name]?.[privilege] === true;

  return {
    knowledgeIndicators: {
      read: granted(KNOWLEDGE_INDICATORS_DATA_STREAM, 'read'),
      write: granted(KNOWLEDGE_INDICATORS_DATA_STREAM, 'write'),
    },
    // Reading significant events end to end needs both detections and events.
    significantEvents: {
      read: granted(DETECTIONS_DATA_STREAM, 'read') && granted(EVENTS_DATA_STREAM, 'read'),
      write: granted(DETECTIONS_DATA_STREAM, 'write'),
    },
  };
};
