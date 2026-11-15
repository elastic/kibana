/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import type {
  GetDecisionTreeResponse,
  GetDecisionTreeVersionResponse,
  ListDecisionTreeVersionsResponse,
  ListDecisionTreesResponse,
} from './types';

const DECISION_TREES_PATH = '/internal/nightshift/decision_trees';
const DECISION_TREE_PATH = `${DECISION_TREES_PATH}/{symptom}`;
const DECISION_TREE_VERSIONS_PATH = `${DECISION_TREE_PATH}/versions`;
const DECISION_TREE_VERSION_PATH = `${DECISION_TREE_VERSIONS_PATH}/{version}`;

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
    queryFn: ({ signal }) => {
      if (symptom === undefined) {
        throw new Error('A symptom is required to fetch a decision tree');
      }

      return http.get<GetDecisionTreeResponse>(buildPath(DECISION_TREE_PATH, { symptom }), {
        signal,
      });
    },
    enabled: symptom !== undefined,
  });
};

export const useDecisionTreeVersions = (symptom: string | undefined) => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: decisionTreeKeys.versions(symptom ?? ''),
    queryFn: ({ signal }) => {
      if (symptom === undefined) {
        throw new Error('A symptom is required to fetch decision tree versions');
      }

      return http.get<ListDecisionTreeVersionsResponse>(
        buildPath(DECISION_TREE_VERSIONS_PATH, { symptom }),
        {
          signal,
        }
      );
    },
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
    queryFn: ({ signal }) => {
      if (symptom === undefined || version === undefined) {
        throw new Error('A symptom and version are required to fetch a decision tree version');
      }

      return http.get<GetDecisionTreeVersionResponse>(
        buildPath(DECISION_TREE_VERSION_PATH, { symptom, version }),
        {
          signal,
        }
      );
    },
    enabled: symptom !== undefined && version !== undefined,
  });
};
