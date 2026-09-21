/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS } from '@kbn/alertzero-common';
import type { UpdateAssigneesResponse } from '@kbn/agentic-investigations-plugin/common';
import { queryKeys as platformQueryKeys } from '@kbn/agentic-investigations-plugin/public';

/**
 * Builds the URL for the PATCH assignees endpoint.
 * Template: `/internal/investigations/{id}/assignees`.
 */
const buildInvestigationAssigneesUrl = (id: string) =>
  `/internal/investigations/${encodeURIComponent(id)}/assignees`;

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
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      assignees,
    }: {
      id: string;
      assignees: string[];
    }): Promise<UpdateAssigneesResponse> =>
      services.http!.patch<UpdateAssigneesResponse>(buildInvestigationAssigneesUrl(id), {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({ assignees }),
      }),
    onSuccess: async () => {
      // Invalidate the proposals list so the queue re-fetches and reflects any
      // server-side side-effects (e.g. the flyout header avatar).
      await queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
    },
  });
};
