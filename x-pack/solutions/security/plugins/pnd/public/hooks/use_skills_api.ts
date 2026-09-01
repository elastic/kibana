/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_SKILLS_URL } from '@kbn/pnd-common';
import type { ListSkillsResponse } from '@kbn/pnd-common';
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
