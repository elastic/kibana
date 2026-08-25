/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOUD_INSTANCE_NAME,
  CONTAINER_IMAGE_NAME,
  DEFAULT_FILTER_QUERY,
  ORCHESTRATOR_CLUSTER_ID,
  ORCHESTRATOR_CLUSTER_NAME,
  ORCHESTRATOR_NAMESPACE,
  ORCHESTRATOR_RESOURCE_ID,
} from '../../../common/constants';
import type {
  QueryDslQueryContainerBool,
  KubernetesCollectionMap,
  KubernetesCollection,
  TreeViewIconProps,
} from '../../types';

export const KUBERNETES_COLLECTION_FIELDS: KubernetesCollectionMap = {
  clusterId: ORCHESTRATOR_CLUSTER_ID,
  clusterName: ORCHESTRATOR_CLUSTER_NAME,
  namespace: ORCHESTRATOR_NAMESPACE,
  node: CLOUD_INSTANCE_NAME,
  pod: ORCHESTRATOR_RESOURCE_ID,
  containerImage: CONTAINER_IMAGE_NAME,
};

export const KUBERNETES_COLLECTION_ICONS_PROPS: KubernetesCollectionMap<TreeViewIconProps> = {
  clusterId: { type: 'cluster', euiVarColor: 'euiColorVis0' },
  clusterName: { type: 'cluster', euiVarColor: 'euiColorVis0' },
  namespace: { type: 'namespace', euiVarColor: 'euiColorVis1' },
  node: { type: 'kubernetesNode', euiVarColor: 'euiColorVis3' },
  pod: { type: 'kubernetesPod', euiVarColor: 'euiColorVis9' },
  containerImage: { type: 'container', euiVarColor: 'euiColorVis8' },
};

export const addTreeNavSelectionToFilterQuery = (
  filterQuery: string | undefined,
  treeNavSelection: Partial<KubernetesCollectionMap>
) => {
  let validFilterQuery = DEFAULT_FILTER_QUERY;

  try {
    const parsedFilterQuery: QueryDslQueryContainerBool = JSON.parse(filterQuery || '{}');
    if (!(parsedFilterQuery?.bool?.filter && Array.isArray(parsedFilterQuery.bool.filter))) {
      throw new Error('Invalid filter query');
    }

    parsedFilterQuery.bool.filter.push(
      ...Object.entries(treeNavSelection)
        .filter(([key]) => (key as KubernetesCollection) !== 'clusterName')
        .map((obj) => {
          const [key, value] = obj as [KubernetesCollection, string];

          return {
            bool: {
              should: [
                {
                  match: {
                    [KUBERNETES_COLLECTION_FIELDS[key]]: value,
                  },
                },
              ],
            },
          };
        })
    );

    validFilterQuery = JSON.stringify(parsedFilterQuery);
  } catch {
    // no-op since validFilterQuery is initialized to be DEFAULT_FILTER_QUERY
  }

  return validFilterQuery;
};
