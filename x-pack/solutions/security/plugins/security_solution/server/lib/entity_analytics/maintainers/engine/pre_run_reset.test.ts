/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { RelationshipsClient } from '@kbn/entity-store/server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

import { preRunReset } from './pre_run_reset';
import { buildActorDiscoveryQuery } from './build_actor_discovery_query';
import type { RelationshipIntegrationConfig } from './types';

const LOG_PREFIX = '[supervises][workday]';

const standardConfig: RelationshipIntegrationConfig = {
  kind: 'standard',
  id: 'workday',
  name: 'Workday',
  indexPattern: (ns) => `logs-workday.users-${ns}`,
  targetEntityType: 'user',
  relationshipKey: 'supervises',
  esqlWhereClause: 'true',
  resetRelationshipsBeforeRun: { entitySource: 'workday' },
};

const bucketedConfig: RelationshipIntegrationConfig = {
  kind: 'bucketed',
  id: 'bucketed-reset',
  name: 'Bucketed',
  indexPattern: (ns) => `logs-bucketed-${ns}`,
  targetEntityType: 'host',
  bucketTargetByThreshold: {
    threshold: 4,
    aboveThresholdRelationship: 'accesses_frequently',
    belowThresholdRelationship: 'accesses_infrequently',
  },
  esqlWhereClause: 'true',
  resetRelationshipsBeforeRun: { entitySource: 'bucketed-source' },
};

const presence = (total: number | { value: number; relation: 'eq' }) => ({
  hits: { total, hits: [] },
});

const indexNotFoundError = () =>
  new esErrors.ResponseError({
    statusCode: 404,
    body: { error: { type: 'index_not_found_exception' } },
    warnings: null,
    headers: {},
    meta: {} as never,
  });

describe('preRunReset', () => {
  let search: jest.Mock;
  let clearRelationshipIds: jest.Mock;
  let esClient: ElasticsearchClient;
  let relationshipsClient: RelationshipsClient;
  let logger: MockedLogger;

  beforeEach(() => {
    search = jest.fn().mockResolvedValue(presence({ value: 1, relation: 'eq' }));
    clearRelationshipIds = jest.fn().mockResolvedValue({ updated: 2, total: 2 });
    esClient = { search } as unknown as ElasticsearchClient;
    relationshipsClient = { clearRelationshipIds } as unknown as RelationshipsClient;
    logger = loggerMock.create();
  });

  const run = (
    config: RelationshipIntegrationConfig,
    {
      signal,
      transportOpts,
    }: {
      signal?: AbortSignal;
      transportOpts?: { signal?: AbortSignal; requestTimeout?: number };
    } = {}
  ) =>
    preRunReset(
      config,
      esClient,
      logger,
      'default',
      relationshipsClient,
      signal,
      transportOpts,
      LOG_PREFIX
    );

  it('proceeds without touching Elasticsearch when the config does not opt in', async () => {
    await expect(run({ ...standardConfig, resetRelationshipsBeforeRun: undefined })).resolves.toBe(
      'proceed'
    );

    expect(search).not.toHaveBeenCalled();
    expect(clearRelationshipIds).not.toHaveBeenCalled();
  });

  describe('when the source can repopulate', () => {
    it('clears the configured relationship for the entity source and proceeds', async () => {
      const { signal } = new AbortController();

      await expect(run(standardConfig, { signal })).resolves.toBe('proceed');

      expect(clearRelationshipIds).toHaveBeenCalledTimes(1);
      expect(clearRelationshipIds).toHaveBeenCalledWith({
        entitySource: 'workday',
        relationshipKey: 'supervises',
        signal,
      });
    });

    it('logs the updated and matched counts from the clear', async () => {
      clearRelationshipIds.mockResolvedValueOnce({ updated: 2, total: 5 });

      await run(standardConfig);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('on 2 of 5 matched workday entities')
      );
    });

    it('clears both threshold keys for a bucketed config and reports the summed counts', async () => {
      clearRelationshipIds
        .mockResolvedValueOnce({ updated: 3, total: 4 })
        .mockResolvedValueOnce({ updated: 4, total: 6 });

      await expect(run(bucketedConfig)).resolves.toBe('proceed');

      const clearedKeys = clearRelationshipIds.mock.calls.map(
        ([params]) => (params as { relationshipKey: string }).relationshipKey
      );
      expect(clearedKeys.sort()).toEqual(['accesses_frequently', 'accesses_infrequently']);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('on 7 of 10 matched bucketed-source entities')
      );
    });

    it('accepts a numeric hits.total from Elasticsearch', async () => {
      search.mockResolvedValueOnce(presence(1));

      await expect(run(standardConfig)).resolves.toBe('proceed');
      expect(clearRelationshipIds).toHaveBeenCalled();
    });

    it('checks the integration index with the same filters Step 1 discovery uses', async () => {
      // If the guard and Step 1 disagreed, the guard could pass while Step 1
      // finds nothing, and the run would clear everything with nothing to restore.
      const transportOpts = { requestTimeout: 1234 };

      await run(standardConfig, { transportOpts });

      const [params, opts] = search.mock.calls[0];
      const { query } = buildActorDiscoveryQuery(standardConfig, undefined) as {
        query: unknown;
      };
      expect(params).toEqual(
        expect.objectContaining({ index: 'logs-workday.users-default', query })
      );
      expect(opts).toBe(transportOpts);
    });
  });

  describe('when the source cannot repopulate', () => {
    it('skips the clear when the source has no documents', async () => {
      search.mockResolvedValueOnce(presence({ value: 0, relation: 'eq' }));

      await expect(run(standardConfig)).resolves.toBe('empty');

      expect(clearRelationshipIds).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('left untouched'));
    });

    it('skips the clear when the source index is missing', async () => {
      search.mockRejectedValueOnce(indexNotFoundError());

      await expect(run(standardConfig)).resolves.toBe('empty');

      expect(clearRelationshipIds).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('skips the clear and logs an error when the source check fails', async () => {
      // A transport failure says nothing about the source's contents, so the
      // destructive path must not be taken.
      search.mockRejectedValueOnce(new Error('cluster unreachable'));

      await expect(run(standardConfig)).resolves.toBe('empty');

      expect(clearRelationshipIds).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('cluster unreachable'));
    });
  });

  describe('when the clear fails', () => {
    it('returns error so the integration is skipped', async () => {
      clearRelationshipIds.mockRejectedValueOnce(new Error('boom'));

      await expect(run(standardConfig)).resolves.toBe('error');

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });

    it('stops at the first failing key instead of clearing the rest', async () => {
      clearRelationshipIds.mockRejectedValueOnce(new Error('boom'));

      await expect(run(bucketedConfig)).resolves.toBe('error');

      expect(clearRelationshipIds).toHaveBeenCalledTimes(1);
    });
  });
});
