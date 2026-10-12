/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import type {
  GetDecisionTreeResponse,
  GetDecisionTreeVersionResponse,
  ListDecisionTreeVersionsResponse,
  ListDecisionTreesResponse,
} from './types';

const DECISION_TREES_PATH = '/internal/nightshift/decision_trees';

const decisionTreeKeys = {
  trees: ['decision_trees', 'trees'] as const,
  tree: (symptom: string) => ['decision_trees', 'tree', symptom] as const,
  versions: (symptom: string) => ['decision_trees', 'versions', symptom] as const,
  version: (symptom: string, version: number) =>
    ['decision_trees', 'version', symptom, version] as const,
};

export const useDecisionTrees = () => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: decisionTreeKeys.trees,
    queryFn: ({ signal }) => http.get<ListDecisionTreesResponse>(DECISION_TREES_PATH, { signal }),
  });
};

export const useDecisionTree = (symptom: string | undefined) => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: decisionTreeKeys.tree(symptom ?? ''),
    queryFn: ({ signal }) =>
      http.get<GetDecisionTreeResponse>(`${DECISION_TREES_PATH}/${symptom}`, { signal }),
    enabled: symptom !== undefined,
  });
};

export const useDecisionTreeVersions = (symptom: string | undefined) => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: decisionTreeKeys.versions(symptom ?? ''),
    queryFn: ({ signal }) =>
      http.get<ListDecisionTreeVersionsResponse>(`${DECISION_TREES_PATH}/${symptom}/versions`, {
        signal,
      }),
    enabled: symptom !== undefined,
  });
};

export const useDecisionTreeVersion = (
  symptom: string | undefined,
  version: number | undefined
) => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: decisionTreeKeys.version(symptom ?? '', version ?? 0),
    queryFn: ({ signal }) =>
      http.get<GetDecisionTreeVersionResponse>(
        `${DECISION_TREES_PATH}/${symptom}/versions/${version}`,
        { signal }
      ),
    enabled: symptom !== undefined && version !== undefined,
  });
};
