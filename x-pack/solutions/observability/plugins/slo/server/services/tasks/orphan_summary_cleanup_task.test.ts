/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { times } from 'lodash';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/constants';
import { getDeleteQueryFilter, SloOrphanSummaryCleanupTask } from './orphan_summary_cleanup_task';

const taskManagerSetup = taskManagerMock.createSetup();
const taskManagerStart = taskManagerMock.createStart();
const logger = loggerMock.create();
const esClient = elasticsearchClientMock.createClusterClient().asInternalUser;
const soClient = savedObjectsClientMock.create();

describe('SloSummaryCleanupTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should run for empty', async function () {
    const task = new SloOrphanSummaryCleanupTask(taskManagerSetup, logger, {} as any);
    await task.start(taskManagerStart, soClient, esClient);

    task.fetchSloSummariesIds = jest.fn().mockReturnValue({ sloSummaryIds: [] });

    task.findSloDefinitions = jest.fn();
    await task.runTask();
  });

  it('should run some slos', async function () {
    const task = new SloOrphanSummaryCleanupTask(taskManagerSetup, logger, {} as any);
    task.findSloDefinitions = jest.fn().mockResolvedValue([
      { id: '1', revision: 1 },
      { id: '2', revision: 1 },
      { id: '3', revision: 1 },
    ]);

    await task.start(taskManagerStart, soClient, esClient);

    task.fetchSloSummariesIds = jest.fn().mockReturnValue({
      sloSummaryIds: [
        { id: '1', revision: 1 },
        { id: '2', revision: 1 },
        { id: '3', revision: 2 },
        { id: '4', revision: NaN },
        { id: '3', revision: 1 },
        { id: '3', revision: 0 },
      ],
    });

    await task.runTask();

    expect(task.fetchSloSummariesIds).toHaveBeenCalled();
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          should: [
            { bool: { must: [{ term: { 'slo.id': '3' } }, { term: { 'slo.revision': 2 } }] } },
            { bool: { must: [{ term: { 'slo.id': '4' } }, { term: { 'slo.revision': NaN } }] } },
            { bool: { must: [{ term: { 'slo.id': '3' } }, { term: { 'slo.revision': 0 } }] } },
          ],
        },
      },
      wait_for_completion: false,
    });
  });

  it('should run lots of slos', async function () {
    const task = new SloOrphanSummaryCleanupTask(taskManagerSetup, logger, {} as any);
    task.findSloDefinitions = jest.fn().mockResolvedValue(
      times(10000, (i) => ({
        id: `${i}`,
        revision: 1,
      }))
    );
    task.fetchSloSummariesIds = jest.fn().mockReturnValue({
      sloSummaryIds: [
        { id: '01', revision: 1 },
        { id: '02', revision: 1 },
        { id: '03', revision: 1 },
        { id: '04', revision: 1 },
        { id: '1', revision: 1 },
        { id: '2', revision: 1 },
        { id: '3', revision: 1 },
        { id: '4', revision: 1 },
      ],
    });
    await task.start(taskManagerStart, soClient, esClient);
    await task.runTask();

    expect(task.fetchSloSummariesIds).toHaveBeenCalledTimes(1);
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(1, {
      wait_for_completion: false,
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          should: getDeleteQueryFilter([
            { id: '01', revision: 1 },
            { id: '02', revision: 1 },
            { id: '03', revision: 1 },
            { id: '04', revision: 1 },
          ]),
        },
      },
    });
  });

  it('should run when lots of slo defs are there', async function () {
    const task = new SloOrphanSummaryCleanupTask(taskManagerSetup, logger, {} as any);
    task.findSloDefinitions = jest.fn().mockResolvedValue(
      times(10000, (i) => ({
        id: `${i}`,
        revision: 2,
      }))
    );
    task.fetchSloSummariesIds = jest.fn().mockImplementation(async (searchKey) => {
      if (!searchKey) {
        return {
          sloSummaryIds: [
            { id: '1', revision: 2 },
            { id: '2', revision: 2 },
            { id: '3', revision: 2 },
            { id: '4', revision: 2 },
            { id: '01', revision: 1 },
            { id: '02', revision: 1 },
            { id: '03', revision: 1 },
            { id: '04', revision: 1 },
          ],
          searchAfter: '1',
        };
      }
      return {
        sloSummaryIds: [
          { id: '5', revision: 2 },
          { id: '6', revision: 2 },
          { id: '7', revision: 2 },
          { id: '8', revision: 2 },
          { id: '05', revision: 1 },
          { id: '06', revision: 1 },
          { id: '07', revision: 1 },
          { id: '08', revision: 1 },
        ],
      };
    });
    await task.start(taskManagerStart, soClient, esClient);
    await task.runTask();

    expect(task.fetchSloSummariesIds).toHaveBeenCalledTimes(2);
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(2);

    expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(1, {
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          should: getDeleteQueryFilter([
            { id: '01', revision: 1 },
            { id: '02', revision: 1 },
            { id: '03', revision: 1 },
            { id: '04', revision: 1 },
          ]),
        },
      },
      wait_for_completion: false,
    });

    expect(esClient.deleteByQuery).toHaveBeenLastCalledWith({
      wait_for_completion: false,
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          should: getDeleteQueryFilter([
            { id: '05', revision: 1 },
            { id: '06', revision: 1 },
            { id: '07', revision: 1 },
            { id: '08', revision: 1 },
          ]),
        },
      },
    });
  });

  it('should run when summaries are way more then defs', async function () {
    const task = new SloOrphanSummaryCleanupTask(taskManagerSetup, logger, {} as any);
    task.findSloDefinitions = jest.fn().mockResolvedValue(
      times(100, (i) => ({
        id: `${i}`,
        revision: 2,
      }))
    );
    task.fetchSloSummariesIds = jest.fn().mockImplementation(async (searchKey) => {
      if (!searchKey) {
        return {
          sloSummaryIds: [
            { id: '1', revision: 2 },
            { id: '2', revision: 2 },
            { id: '3', revision: 2 },
            { id: '4', revision: 2 },
            { id: '01', revision: 1 },
            { id: '02', revision: 1 },
            { id: '03', revision: 1 },
            { id: '04', revision: 1 },
          ],
          searchAfter: '1',
        };
      }
      return {
        sloSummaryIds: [
          { id: '5', revision: 2 },
          { id: '6', revision: 2 },
          { id: '7', revision: 2 },
          { id: '8', revision: 2 },
          { id: '05', revision: 1 },
          { id: '06', revision: 1 },
          { id: '07', revision: 1 },
          { id: '08', revision: 1 },
        ],
      };
    });
    await task.start(taskManagerStart, soClient, esClient);
    await task.runTask();

    expect(task.fetchSloSummariesIds).toHaveBeenCalledTimes(2);
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(2);
    expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(1, {
      wait_for_completion: false,
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          should: getDeleteQueryFilter([
            { id: '01', revision: 1 },
            { id: '02', revision: 1 },
            { id: '03', revision: 1 },
            { id: '04', revision: 1 },
          ]),
        },
      },
    });
    expect(esClient.deleteByQuery).toHaveBeenLastCalledWith({
      wait_for_completion: false,
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          should: getDeleteQueryFilter([
            { id: '05', revision: 1 },
            { id: '06', revision: 1 },
            { id: '07', revision: 1 },
            { id: '08', revision: 1 },
          ]),
        },
      },
    });
  });

  it('should run when there are no Slo defs', async function () {
    const task = new SloOrphanSummaryCleanupTask(taskManagerSetup, logger, {} as any);
    task.findSloDefinitions = jest.fn().mockResolvedValue([]);
    task.fetchSloSummariesIds = jest.fn().mockImplementation(async (searchKey) => {
      if (!searchKey) {
        return {
          sloSummaryIds: [
            { id: '1', revision: 2 },
            { id: '2', revision: 2 },
            { id: '3', revision: 2 },
            { id: '4', revision: 2 },
            { id: '01', revision: 1 },
            { id: '02', revision: 1 },
            { id: '03', revision: 1 },
            { id: '04', revision: 1 },
          ],
          searchAfter: '1',
        };
      }
      return {
        sloSummaryIds: [
          { id: '5', revision: 2 },
          { id: '6', revision: 2 },
          { id: '7', revision: 2 },
          { id: '8', revision: 2 },
          { id: '05', revision: 1 },
          { id: '06', revision: 1 },
          { id: '07', revision: 1 },
          { id: '08', revision: 1 },
        ],
      };
    });
    await task.start(taskManagerStart, soClient, esClient);
    await task.runTask();

    expect(task.fetchSloSummariesIds).toHaveBeenCalledTimes(2);
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(2);

    expect(esClient.deleteByQuery).toHaveBeenNthCalledWith(1, {
      wait_for_completion: false,
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          should: getDeleteQueryFilter([
            { id: '1', revision: 2 },
            { id: '2', revision: 2 },
            { id: '3', revision: 2 },
            { id: '4', revision: 2 },
            { id: '01', revision: 1 },
            { id: '02', revision: 1 },
            { id: '03', revision: 1 },
            { id: '04', revision: 1 },
          ]),
        },
      },
    });
  });
});
