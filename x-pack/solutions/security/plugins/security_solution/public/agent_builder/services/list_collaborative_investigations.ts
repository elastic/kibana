/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_PUBLIC_API } from '../constants';
import { isCollaborativeInvestigation } from '../utils/investigation_conversation_utils';

interface ListConversationsResponse {
  results: ConversationWithoutRounds[];
}

export const listCollaborativeInvestigations = async ({
  http,
}: {
  http: HttpSetup;
}): Promise<ConversationWithoutRounds[]> => {
  const response = await http.get<ListConversationsResponse>(
    `${AGENT_BUILDER_PUBLIC_API}/conversations`,
    {
      version: '2023-10-31',
    }
  );

  return response.results
    .filter(isCollaborativeInvestigation)
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    );
};
