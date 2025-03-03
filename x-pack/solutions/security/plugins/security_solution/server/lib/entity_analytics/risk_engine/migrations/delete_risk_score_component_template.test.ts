/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteRiskScoreComponent } from './delete_risk_score_component_template';
import { coreMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { auditLoggerMock } from '@kbn/core-security-server-mocks';

jest.mock('@kbn/alerting-plugin/server', () => ({
  createOrUpdateIndexTemplate: jest.fn(),
}));

jest.mock('../../risk_score/configurations', () => ({
  getIndexPatternDataStream: jest.fn(),
  nameSpaceAwareMappingsComponentName: jest.fn(),
}));

describe('deleteRiskScoreComponent', () => {
  const logger = loggingSystemMock.createLogger();
  const coreStart = coreMock.createStart();
  const soClient = savedObjectsClientMock.create();
  const mockAuditLogger = auditLoggerMock.create();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  const getStartServicesMock = jest.fn().mockReturnValue([
    {
      ...coreStart,
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue(soClient),
        getScopedClient: jest.fn().mockReturnValue(soClient),
      },
      elasticsearch: { client: { asInternalUser: esClient } },
    },
  ]);
  const kibanaVersion = '8.0.0';

  const buildSavedObject = (attributes = {}) => ({
    namespaces: ['default'],
    attributes,
    id: 'id',
    type: 'type',
    references: [],
    score: 1,
  });

  const mockSavedObjectsResponseDefaults = {
    total: 1,
    page: 1,
    per_page: 10,
    saved_objects: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log the start and end of the migration', async () => {
    await deleteRiskScoreComponent({
      auditLogger: mockAuditLogger,
      logger,
      kibanaVersion,
      getStartServices: getStartServicesMock,
    });

    expect(logger.info).toHaveBeenCalledWith(
      'Migration to to delete risk score component template  begins'
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Migration to delete risk score component template for namespace')
    );
  });

  it('should handle errors when namespace is undefined', async () => {
    const mockSavedObjectsResponse = {
      ...mockSavedObjectsResponseDefaults,
      saved_objects: [buildSavedObject({ _meta: { mappingsVersion: '1.0.0' } })],
    };

    await deleteRiskScoreComponent({
      auditLogger: mockAuditLogger,
      logger,
      kibanaVersion,
      getStartServices: getStartServicesMock,
    });

    expect(logger.error).toHaveBeenCalledWith('Namespace is undefined for saved object 1');
  });

  it('should handle errors when creating/updating index template', async () => {
    const mockSavedObjectsResponse = {
      ...mockSavedObjectsResponseDefaults,
      saved_objects: [buildSavedObject({ _meta: { mappingsVersion: '1.0.0' } })],
    };

    esClient.cluster.deleteComponentTemplate.mockRejectedValue(new Error('Test error'));

    await deleteRiskScoreComponent({
      auditLogger: mockAuditLogger,
      logger,
      kibanaVersion,
      getStartServices: getStartServicesMock,
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error deleting the component template for namespace default: Test error'
      )
    );
  });
});
