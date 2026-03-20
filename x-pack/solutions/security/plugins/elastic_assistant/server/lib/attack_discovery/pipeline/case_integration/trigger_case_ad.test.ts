/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { triggerCaseAttackDiscovery } from './trigger_case_ad';
import type { IncrementalAdConfig } from '../types';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createElasticsearchClient();

const mockConfig: IncrementalAdConfig = {
  enabled: true,
  minNewAlerts: 2,
  autoTriggerOnAttachment: true,
};

const mockActionsClient = {
  execute: jest.fn(),
  get: jest.fn(),
} as unknown as PublicMethodsOf<ActionsClient>;

const mockRequest = {} as unknown as KibanaRequest;
const mockSavedObjectsClient = {} as unknown as SavedObjectsClientContract;

const createMockCases = (alertDocs: Array<{ id: string }>) => {
  const mockAttachments = {
    getAllDocumentsAttachedToCase: jest.fn().mockResolvedValue(alertDocs),
  };
  return {
    getCasesClientWithRequest: jest.fn().mockResolvedValue({
      attachments: mockAttachments,
    }),
  } as unknown as CasesServerStart;
};

describe('triggerCaseAttackDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    esClient.indices.exists.mockResolvedValue(true);
    esClient.search.mockResolvedValue({
      hits: { hits: [], total: { value: 0 } },
    } as unknown as ReturnType<typeof esClient.search>);
  });

  it('skips when no alerts are attached to the case', async () => {
    const cases = createMockCases([]);

    const result = await triggerCaseAttackDiscovery({
      actionsClient: mockActionsClient,
      caseId: 'case-1',
      cases,
      config: mockConfig,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'default',
      generateAttackDiscoveriesFn: jest.fn(),
    });

    expect(result.triggered).toBe(false);
    expect(result.skipReason).toContain('No alerts');
  });

  it('skips when delta alerts are below minimum threshold', async () => {
    const cases = createMockCases([{ id: 'alert-1' }]);

    const result = await triggerCaseAttackDiscovery({
      actionsClient: mockActionsClient,
      caseId: 'case-1',
      cases,
      config: { ...mockConfig, minNewAlerts: 5 },
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'default',
      generateAttackDiscoveriesFn: jest.fn(),
    });

    expect(result.triggered).toBe(false);
    expect(result.skipReason).toContain('below minimum threshold');
  });

  it('triggers AD when enough delta alerts exist', async () => {
    const cases = createMockCases([{ id: 'alert-1' }, { id: 'alert-2' }, { id: 'alert-3' }]);
    const mockGenerate = jest.fn().mockResolvedValue({
      attackDiscoveries: [{ alertIds: ['alert-1'], title: 'Test' }],
      generationUuid: 'gen-1',
    });
    esClient.index.mockResolvedValue({ result: 'created' } as unknown as ReturnType<
      typeof esClient.index
    >);

    const result = await triggerCaseAttackDiscovery({
      actionsClient: mockActionsClient,
      caseId: 'case-1',
      cases,
      config: mockConfig,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'default',
      generateAttackDiscoveriesFn: mockGenerate,
    });

    expect(result.triggered).toBe(true);
    expect(result.discoveriesGenerated).toBe(1);
    expect(mockGenerate).toHaveBeenCalled();
  });

  it('returns triggered:false when AD generation fails', async () => {
    const cases = createMockCases([{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }]);
    const mockGenerate = jest.fn().mockRejectedValue(new Error('LLM timeout'));

    const result = await triggerCaseAttackDiscovery({
      actionsClient: mockActionsClient,
      caseId: 'case-1',
      cases,
      config: mockConfig,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'default',
      generateAttackDiscoveriesFn: mockGenerate,
    });

    expect(result.triggered).toBe(false);
    expect(result.skipReason).toContain('AD generation failed');
  });

  it('uses space-specific index pattern for non-default spaces', async () => {
    const cases = createMockCases([{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }]);
    const mockGenerate = jest.fn().mockResolvedValue({
      attackDiscoveries: [],
      generationUuid: 'gen-1',
    });
    esClient.index.mockResolvedValue({ result: 'created' } as unknown as ReturnType<
      typeof esClient.index
    >);

    await triggerCaseAttackDiscovery({
      actionsClient: mockActionsClient,
      caseId: 'case-1',
      cases,
      config: mockConfig,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'sec-ops',
      generateAttackDiscoveriesFn: mockGenerate,
    });

    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          alertsIndexPattern: '.alerts-security.alerts-sec-ops',
        }),
      })
    );
  });
});
