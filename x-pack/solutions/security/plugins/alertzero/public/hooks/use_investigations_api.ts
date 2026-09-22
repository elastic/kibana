/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { UpdateAssigneesResponse } from '@kbn/agentic-investigations-plugin/common';
import { queryKeys as platformQueryKeys } from '@kbn/agentic-investigations-plugin/public';
import { updateInvestigationAssignees } from './update_investigation_assignees';

/**
 * Overwrites the assignee list on an investigation conversation.
 *
 * Overwrite semantics: the supplied list fully replaces whatever is stored.
 * Pass `assignees: []` to clear all assignees.
 *
 * **Note**: the underlying conversation write is owner-only. A user who holds
 * `manage_investigations` but did not create the conversation will get a 404
 * response rather than a 403. This is a known limitation tracked in a follow-up
 * issue on the agent_builder conversation ACL.
 */
export const useUpdateAssignees = () => {
  const {
    services: { http },
  } = useKibana<CoreStart>();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      assignees,
    }: {
      id: string;
      assignees: string[];
    }): Promise<UpdateAssigneesResponse> => updateInvestigationAssignees(http, id, assignees),
    onSuccess: async (_, { id }) => {
      await Promise.all([
        // Refresh the queue so any server-side side-effects are visible.
        queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all }),
        // Refresh the flyout header which reads assignees from the conversation cache.
        // Key matches agent_builder's queryKeys.conversations.byId(id).
        queryClient.invalidateQueries({ queryKey: ['conversations', id] }),
      ]);
    },
  });
};
