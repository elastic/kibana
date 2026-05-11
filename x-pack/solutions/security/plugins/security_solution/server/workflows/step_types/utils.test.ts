/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { coreMock } from '@kbn/core/server/mocks';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import {
  createFakeSecuritySolutionContext,
  createFakeRequest,
  getAttacksData,
  resolveAttackTargetsAndIndices,
} from './utils';

describe('Workflow step utils', () => {
  let coreSetupMock: ReturnType<typeof coreMock.createSetup>;
  let coreStartMock: ReturnType<typeof coreMock.createStart>;
  let contextMock: StepHandlerContext;
  let esClientMock: { search: jest.Mock };
  let loggerMock: { error: jest.Mock };

  beforeEach(() => {
    coreSetupMock = coreMock.createSetup();
    coreStartMock = coreMock.createStart();
    coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, {}, {}]);

    esClientMock = {
      search: jest.fn(),
    };

    loggerMock = {
      error: jest.fn(),
    };

    contextMock = {
      contextManager: {
        getFakeRequest: jest.fn().mockReturnValue({ headers: {}, params: {} }),
        getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'test-space' } }),
        getScopedEsClient: jest.fn().mockReturnValue(esClientMock),
      },
      logger: loggerMock,
    } as unknown as StepHandlerContext;
  });

  describe('createFakeSecuritySolutionContext', () => {
    it('should create a fake security solution context', async () => {
      const result = await createFakeSecuritySolutionContext(coreSetupMock, contextMock);

      expect(result).toBeDefined();

      const securitySolution = await result.securitySolution;
      expect(securitySolution.getSpaceId()).toBe('test-space');
      expect(() => securitySolution.getRuleDataService()).toThrow(
        'getRuleDataService is not implemented in fake context'
      );

      const core = await result.core;
      expect(core.elasticsearch.client.asCurrentUser).toBe(esClientMock);

      core.security.authc.getCurrentUser();
      expect(coreStartMock.security.authc.getCurrentUser).toHaveBeenCalledWith({
        headers: {},
        params: {},
      });
    });

    it('should default spaceId to "default" if not provided', async () => {
      (contextMock.contextManager.getContext as jest.Mock).mockReturnValue({});
      const result = await createFakeSecuritySolutionContext(coreSetupMock, contextMock);
      const securitySolution = await result.securitySolution;
      expect(securitySolution.getSpaceId()).toBe('default');
    });
  });

  describe('createFakeRequest', () => {
    it('should create a fake request with the provided body', () => {
      const body = { test: 'data' };
      const result = createFakeRequest(contextMock, body);

      expect(result).toEqual({
        headers: {},
        params: {},
        body: { test: 'data' },
      });
    });
  });

  describe('getAttacksData', () => {
    it('should return empty arrays if no attack IDs are provided', async () => {
      const result = await getAttacksData(contextMock, []);
      expect(result).toEqual({ existingAttackIds: [], relatedAlertIds: [] });
      expect(esClientMock.search).not.toHaveBeenCalled();
    });

    it('should fetch attack data from Elasticsearch and throw error if attacks are missing', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'attack-1',
              _source: { 'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'] },
            },
          ],
        },
      });

      await expect(getAttacksData(contextMock, ['attack-1', 'attack-2'])).rejects.toThrow(
        'The following attack IDs do not exist: attack-2'
      );
    });

    it('should fetch attack data from Elasticsearch and return existing attacks and related alerts', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'attack-1',
              _source: { 'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'] },
            },
            {
              _id: 'attack-2',
              _source: { 'kibana.alert.attack_discovery.alert_ids': ['alert-2', 'alert-3'] },
            },
          ],
        },
      });

      const result = await getAttacksData(contextMock, ['attack-1', 'attack-2']);

      expect(esClientMock.search).toHaveBeenCalledWith({
        index: `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-test-space`,
        query: {
          ids: {
            values: ['attack-1', 'attack-2'],
          },
        },
        _source: ['kibana.alert.attack_discovery.alert_ids'],
        size: 10000,
      });

      expect(result).toEqual({
        existingAttackIds: ['attack-1', 'attack-2'],
        relatedAlertIds: ['alert-1', 'alert-2', 'alert-3'],
      });
    });

    it('should handle missing spaceId and default to "default"', async () => {
      (contextMock.contextManager.getContext as jest.Mock).mockReturnValue({});
      esClientMock.search.mockResolvedValue({ hits: { hits: [{ _id: 'attack-1', _source: {} }] } });

      await getAttacksData(contextMock, ['attack-1']);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default`,
        })
      );
    });

    it('should catch errors and log them, then rethrow', async () => {
      const error = new Error('Elasticsearch error');
      esClientMock.search.mockRejectedValue(error);

      await expect(getAttacksData(contextMock, ['attack-1'])).rejects.toThrow(
        'Elasticsearch error'
      );

      expect(loggerMock.error).toHaveBeenCalledWith('Failed to fetch attack data', error);
    });

    it('should catch non-Error objects and log them, then rethrow', async () => {
      esClientMock.search.mockRejectedValue('String error');

      await expect(getAttacksData(contextMock, ['attack-1'])).rejects.toEqual('String error');

      expect(loggerMock.error).toHaveBeenCalledWith(
        'Failed to fetch attack data',
        new Error('String error')
      );
    });
  });

  describe('resolveAttackTargetsAndIndices', () => {
    it('should resolve targets and indices without related alerts', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'attack-1',
              _source: { 'kibana.alert.attack_discovery.alert_ids': ['alert-1'] },
            },
          ],
        },
      });

      const fakeContext = await createFakeSecuritySolutionContext(coreSetupMock, contextMock);
      const ruleDataClient = {
        indexNameWithNamespace: jest.fn().mockReturnValue('.alerts-index'),
      } as unknown as IRuleDataClient;
      const input = { attack_ids: ['attack-1'], update_related_alerts: false };

      const { targetIds, getIndexPattern } = await resolveAttackTargetsAndIndices(
        contextMock,
        fakeContext,
        ruleDataClient,
        input
      );

      expect(targetIds).toEqual(['attack-1']);
      const indices = await getIndexPattern();
      expect(indices).toEqual([`${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-test-space`]);
    });

    it('should resolve targets and indices with related alerts', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'attack-1',
              _source: { 'kibana.alert.attack_discovery.alert_ids': ['alert-1'] },
            },
          ],
        },
      });

      const fakeContext = await createFakeSecuritySolutionContext(coreSetupMock, contextMock);
      const ruleDataClient = {
        indexNameWithNamespace: jest.fn().mockReturnValue('.alerts-index'),
      } as unknown as IRuleDataClient;
      const input = { attack_ids: ['attack-1'], update_related_alerts: true };

      const { targetIds, getIndexPattern } = await resolveAttackTargetsAndIndices(
        contextMock,
        fakeContext,
        ruleDataClient,
        input
      );

      expect(targetIds).toEqual(['attack-1', 'alert-1']);
      const indices = await getIndexPattern();
      expect(indices).toEqual([
        '.alerts-index',
        `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-test-space`,
      ]);
    });
  });
});
