/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_SKILLS_URL, buildSkillUrl } from '@kbn/pnd-common';
import type { ListSkillsResponse, WatchSkill } from '@kbn/pnd-common';
import { queryKeys } from '../query_keys';
import { retryOnTransientError } from './use_watches_api';

export const useSkills = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.skills.list(),
    queryFn: async (): Promise<ListSkillsResponse> =>
      services.http!.get<ListSkillsResponse>(PND_SKILLS_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

export interface ToggleSkillVariables {
  skillId: string;
  enabled: boolean;
}

/**
 * Toggles a skill's global flag. Optimistic so the switch responds immediately.
 *
 * Also invalidates every watch detail: turning a skill off globally greys out its row inside every
 * watch that uses it, and can degrade workers that depend on it.
 */
export const useToggleSkill = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      skillId,
      enabled,
    }: ToggleSkillVariables): Promise<{
      skill: WatchSkill;
    }> =>
      services.http!.patch<{ skill: WatchSkill }>(buildSkillUrl(skillId), {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({ enabled }),
      }),
    onMutate: async ({ skillId, enabled }) => {
      const queryKey = queryKeys.skills.list();
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<ListSkillsResponse>(queryKey);
      if (previous) {
        queryClient.setQueryData<ListSkillsResponse>(queryKey, {
          skills: previous.skills.map((skill) =>
            skill.id === skillId ? { ...skill, enabled } : skill
          ),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.skills.list(), context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.skills.list() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.watches.all });
    },
  });
};
