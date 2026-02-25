/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { Annotation, StateGraph } from '@langchain/langgraph';
import type { EntityType } from '../../../../../../../common/api/entity_analytics';
import type { ActiveMlModules, SecurityJobType } from '../get_security_ml_jobs';
import { FIND_MATCHING_ML_JOBS_NODE, findMatchingMlJobsNode } from './find_matching_ml_job_node';
import {
  FIND_INDICES_FOR_ML_JOBS_NODE,
  findIndicesForMlJobsNode,
} from './find_indices_for_ml_jobs_node';

const StateAnnotation = Annotation.Root({
  recommendedJobs: Annotation<SecurityJobType[]>(),
  recommendedStartedJobIds: Annotation<string[]>(),
  indices: Annotation<string[]>(),
});

export type StateType = typeof StateAnnotation.State;

interface CreateFindMlJobsAndIndicesGraphOpts {
  activeMlModules: ActiveMlModules[];
  entityType: EntityType;
  esClient: ElasticsearchClient;
  model: ScopedModel;
  prompt: string;
  threshold: number;
}

export const createFindMlJobsAndIndicesGraph = ({
  activeMlModules,
  entityType,
  esClient,
  model,
  prompt,
  threshold,
}: CreateFindMlJobsAndIndicesGraphOpts) => {
  async function findMatchingMlJobs(): Promise<Partial<StateType>> {
    return findMatchingMlJobsNode({ activeMlModules, entityType, model, prompt });
  }

  async function findIndicesForMlJobs({
    recommendedStartedJobIds,
  }: StateType): Promise<Partial<StateType>> {
    return findIndicesForMlJobsNode({ esClient, recommendedStartedJobIds, threshold });
  }

  return new StateGraph(StateAnnotation)
    .addNode(FIND_MATCHING_ML_JOBS_NODE, findMatchingMlJobs)
    .addNode(FIND_INDICES_FOR_ML_JOBS_NODE, findIndicesForMlJobs)
    .addEdge('__start__', FIND_MATCHING_ML_JOBS_NODE)
    .addConditionalEdges(FIND_MATCHING_ML_JOBS_NODE, ({ recommendedStartedJobIds }) =>
      recommendedStartedJobIds.length > 0 ? FIND_INDICES_FOR_ML_JOBS_NODE : '__end__'
    )
    .addEdge(FIND_INDICES_FOR_ML_JOBS_NODE, '__end__')
    .compile();
};
