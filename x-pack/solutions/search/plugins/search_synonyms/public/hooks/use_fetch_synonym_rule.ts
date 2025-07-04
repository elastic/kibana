/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SynonymsSynonymRule } from '@elastic/elasticsearch/lib/api/types';
import { useQuery } from '@tanstack/react-query';
import { SYNONYMS_RULE_FETCH_QUERY_KEY } from '../../common/constants';
import { useKibana } from './use_kibana';

export const useFetchSynonymRule = (synonymsSetId: string, ruleId: string) => {
  const {
    services: { http },
  } = useKibana();

  return useQuery({
    queryKey: [SYNONYMS_RULE_FETCH_QUERY_KEY, synonymsSetId, ruleId],
    queryFn: async () => {
      return await http.get<SynonymsSynonymRule>(
        `/internal/search_synonyms/synonyms/${synonymsSetId}/${ruleId}`
      );
    },
    enabled: !!synonymsSetId && !!ruleId,
  });
};
