/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { EntityType } from '../../../../../../../common/api/entity_analytics';
import { createFindMlJobsAndIndicesGraph } from './graph';
import type { ActiveMlModules, SecurityJobType } from '../get_security_ml_jobs';
import { findMatchingMlJobsNode } from './find_matching_ml_job_node';
import { findIndicesForMlJobsNode } from './find_indices_for_ml_jobs_node';

jest.mock('./find_matching_ml_job_node');
jest.mock('./find_indices_for_ml_jobs_node');

const findMatchingMlJobsNodeMock = findMatchingMlJobsNode as jest.MockedFunction<
  typeof findMatchingMlJobsNode
>;
const findIndicesForMlJobsNodeMock = findIndicesForMlJobsNode as jest.MockedFunction<
  typeof findIndicesForMlJobsNode
>;

const createDefaultOpts = () => ({
  activeMlModules: [] as ActiveMlModules[],
  entityType: 'host' as EntityType,
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  model: {} as ScopedModel,
  prompt: 'Find anomalous logins',
  threshold: 50,
});

describe('createFindMlJobsAndIndicesGraph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('graph execution', () => {
    it('calls findMatchingMlJobsNode with correct options', async () => {
      const opts = createDefaultOpts();
      const expectedJobs: SecurityJobType[] = [
        { id: 'job-1', description: 'Auth', isJobStarted: true },
      ];
      findMatchingMlJobsNodeMock.mockResolvedValue({
        recommendedJobs: expectedJobs,
        recommendedStartedJobIds: ['job-1'],
      });
      findIndicesForMlJobsNodeMock.mockResolvedValue({ indices: ['.ml-anomalies-job-1'] });

      const graph = createFindMlJobsAndIndicesGraph(opts);
      await graph.invoke({});

      expect(findMatchingMlJobsNodeMock).toHaveBeenCalledTimes(1);
      expect(findMatchingMlJobsNodeMock).toHaveBeenCalledWith({
        activeMlModules: opts.activeMlModules,
        entityType: opts.entityType,
        model: opts.model,
        prompt: opts.prompt,
      });
    });

    it('when recommendedStartedJobIds is empty, ends after first node and does not call findIndicesForMlJobsNode', async () => {
      findMatchingMlJobsNodeMock.mockResolvedValue({
        recommendedJobs: [],
        recommendedStartedJobIds: [],
      });

      const graph = createFindMlJobsAndIndicesGraph(createDefaultOpts());
      const result = await graph.invoke({});

      expect(findMatchingMlJobsNodeMock).toHaveBeenCalledTimes(1);
      expect(findIndicesForMlJobsNodeMock).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        recommendedJobs: [],
        recommendedStartedJobIds: [],
      });
    });

    it('when recommendedStartedJobIds is non-empty, runs findIndicesForMlJobsNode and merges state', async () => {
      const recommendedJobs: SecurityJobType[] = [
        { id: 'job-1', description: 'Auth', isJobStarted: true },
      ];
      const recommendedStartedJobIds = ['job-1'];
      const indices = ['.ml-anomalies-job-1', '.ml-anomalies-job-2'];

      findMatchingMlJobsNodeMock.mockResolvedValue({
        recommendedJobs,
        recommendedStartedJobIds,
      });
      findIndicesForMlJobsNodeMock.mockResolvedValue({ indices });

      const opts = createDefaultOpts();
      const graph = createFindMlJobsAndIndicesGraph(opts);
      const result = await graph.invoke({});

      expect(findMatchingMlJobsNodeMock).toHaveBeenCalledTimes(1);
      expect(findIndicesForMlJobsNodeMock).toHaveBeenCalledTimes(1);
      expect(findIndicesForMlJobsNodeMock).toHaveBeenCalledWith({
        esClient: opts.esClient,
        recommendedStartedJobIds,
        threshold: opts.threshold,
      });
      expect(result).toMatchObject({
        recommendedJobs,
        recommendedStartedJobIds,
        indices,
      });
    });

    it('passes full state into findIndicesForMlJobsNode', async () => {
      const recommendedJobs: SecurityJobType[] = [
        { id: 'job-a', description: 'Desc', influencers: ['host.name'], isJobStarted: true },
      ];
      findMatchingMlJobsNodeMock.mockResolvedValue({
        recommendedJobs,
        recommendedStartedJobIds: ['job-a'],
      });
      findIndicesForMlJobsNodeMock.mockImplementation(async ({ recommendedStartedJobIds }) => ({
        indices: recommendedStartedJobIds.map((id) => `.ml-anomalies-${id}`),
      }));

      const graph = createFindMlJobsAndIndicesGraph(createDefaultOpts());
      const result = await graph.invoke({});

      expect(result.indices).toEqual(['.ml-anomalies-job-a']);
    });
  });
});
