/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import { buildDefaultEsqlQuery } from '.';

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const mockFieldCapsResponse = (fields: string[]) => ({
  fields: Object.fromEntries(fields.map((f) => [f, { keyword: { type: 'keyword' } }])),
  indices: ['.alerts-security.alerts-default'],
});

const mockEsClient = {
  fieldCaps: jest.fn().mockResolvedValue(mockFieldCapsResponse([])),
  search: jest.fn(),
} as unknown as ElasticsearchClient;

const DEFAULT_SPACE_ID = 'default';
const DEFAULT_SIZE = 100;
const DEFAULT_ALERTS_INDEX_PATTERN = `.alerts-security.alerts-${DEFAULT_SPACE_ID}`;

describe('buildDefaultEsqlQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when allowedFields is provided', () => {
    it('does not call esClient.search', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name', 'user.name'])
      );

      await buildDefaultEsqlQuery({
        allowedFields: ['host.name', 'user.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(mockEsClient.search).not.toHaveBeenCalled();
    });

    it('returns a query with the provided fields in KEEP', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name', 'user.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name', 'user.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain('| KEEP');
      expect(result).toContain('      _id,');
      expect(result).toContain('      @timestamp,');
      expect(result).toContain('      host.name,');
      expect(result).toContain('      user.name');
    });

    it('always includes _id and @timestamp even when not in allowedFields', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain('      _id,');
      expect(result).toContain('      @timestamp,');
      expect(result).toContain('      host.name');
    });

    it('deduplicates _id and @timestamp if already in allowedFields', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['_id', '@timestamp', 'host.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      const keepLines = result
        .split('\n')
        .filter((line: string) => line.includes('_id') || line.includes('@timestamp'));
      const idOccurrences = keepLines.filter((line: string) =>
        line.trimStart().startsWith('_id')
      ).length;
      const timestampOccurrences = keepLines.filter((line: string) =>
        line.trimStart().startsWith('@timestamp')
      ).length;

      expect(idOccurrences).toBe(1);
      expect(timestampOccurrences).toBe(1);
    });

    it('sorts the user-provided fields alphabetically in KEEP', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['agent.id', 'host.name', 'user.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['user.name', 'host.name', 'agent.id'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      const keepSection = result.substring(result.indexOf('| KEEP'));
      const fieldLines = keepSection.split('\n').slice(1);
      const fields = fieldLines.map((line: string) => line.trim().replace(/,$/, ''));

      expect(fields).toEqual(['_id', '@timestamp', 'agent.id', 'host.name', 'user.name']);
    });

    it('excludes fields that do not exist in the index', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name', 'Ransomware.feature', 'actions.context'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain('      _id,');
      expect(result).toContain('      @timestamp,');
      expect(result).toContain('      host.name');
      expect(result).not.toContain('Ransomware.feature');
      expect(result).not.toContain('actions.context');
    });

    it('falls back to all candidate fields when fieldCaps fails', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockRejectedValueOnce(
        new Error('index_not_found_exception')
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name', 'user.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain('      _id,');
      expect(result).toContain('      @timestamp,');
      expect(result).toContain('      host.name,');
      expect(result).toContain('      user.name');
    });
  });

  describe('when allowedFields is omitted', () => {
    beforeEach(() => {
      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'field-1',
              _source: {
                allowed: true,
                anonymized: false,
                field: 'host.name',
              },
            },
            {
              _id: 'field-2',
              _source: {
                allowed: true,
                anonymized: true,
                field: 'user.name',
              },
            },
            {
              _id: 'field-3',
              _source: {
                allowed: false,
                anonymized: false,
                field: 'source.ip',
              },
            },
          ],
        },
      });

      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValue(
        mockFieldCapsResponse(['host.name', 'user.name'])
      );
    });

    it('calls fetchAnonymizationFields via esClient.search', async () => {
      await buildDefaultEsqlQuery({
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(mockEsClient.search).toHaveBeenCalledWith({
        index: `.kibana-elastic-ai-assistant-anonymization-fields-${DEFAULT_SPACE_ID}`,
        query: { match_all: {} },
        size: 1000,
      });
    });

    it('only includes fields where allowed is true and that exist in the index', async () => {
      const result = await buildDefaultEsqlQuery({
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain('host.name');
      expect(result).toContain('user.name');
      expect(result).not.toContain('source.ip');
    });

    it('always includes _id and @timestamp', async () => {
      const result = await buildDefaultEsqlQuery({
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain('      _id,');
      expect(result).toContain('      @timestamp,');
    });

    it('calls fieldCaps to validate fields against the index', async () => {
      await buildDefaultEsqlQuery({
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(mockEsClient.fieldCaps).toHaveBeenCalledWith({
        fields: ['host.name', 'user.name'],
        index: DEFAULT_ALERTS_INDEX_PATTERN,
      });
    });

    it('throws when fetchAnonymizationFields fails', async () => {
      (mockEsClient.search as jest.Mock).mockRejectedValue(new Error('index_not_found_exception'));

      await expect(
        buildDefaultEsqlQuery({
          esClient: mockEsClient,
          logger: mockLogger,
          spaceId: DEFAULT_SPACE_ID,
        })
      ).rejects.toThrow();
    });

    it('throws when no allowed fields are found', async () => {
      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'field-1',
              _source: {
                allowed: false,
                anonymized: false,
                field: 'host.name',
              },
            },
          ],
        },
      });

      await expect(
        buildDefaultEsqlQuery({
          esClient: mockEsClient,
          logger: mockLogger,
          spaceId: DEFAULT_SPACE_ID,
        })
      ).rejects.toThrow();
    });
  });

  describe('query structure', () => {
    it('includes FROM with the default alerts index pattern and METADATA _id', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain(`FROM ${DEFAULT_ALERTS_INDEX_PATTERN}`);
      expect(result).toContain('    METADATA _id');
    });

    it('includes WHERE @timestamp >= NOW() - 24 hours as the first WHERE clause', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      const lines = result.split('\n');
      const whereLines = lines.filter((line: string) => line.includes('WHERE'));
      expect(whereLines[0]).toBe('  | WHERE @timestamp >= NOW() - 24 hours');
    });

    it('includes WHERE clauses for open/acknowledged and excluding building blocks', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain('  | WHERE @timestamp >= NOW() - 24 hours');
      expect(result).toContain(
        '  | WHERE kibana.alert.workflow_status IN ("open", "acknowledged")'
      );
      expect(result).toContain('  | WHERE kibana.alert.building_block_type IS NULL');
    });

    it('includes SORT by risk_score DESC and @timestamp DESC', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain('  | SORT kibana.alert.risk_score DESC, @timestamp DESC');
    });

    it('includes LIMIT with default size of 100', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain(`  | LIMIT ${DEFAULT_SIZE}`);
    });

    it('uses the provided size when specified', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const customSize = 50;

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        size: customSize,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain(`  | LIMIT ${customSize}`);
    });

    it('uses a custom alertsIndexPattern when provided', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const customPattern = '.alerts-security.alerts-my-space';

      const result = await buildDefaultEsqlQuery({
        alertsIndexPattern: customPattern,
        allowedFields: ['host.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain(`FROM ${customPattern}`);
      expect(result).not.toContain(DEFAULT_ALERTS_INDEX_PATTERN);
    });

    it('constructs the correct full query structure', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name', 'user.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name', 'user.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      const expectedQuery = [
        `FROM ${DEFAULT_ALERTS_INDEX_PATTERN}`,
        '    METADATA _id',
        '  | WHERE @timestamp >= NOW() - 24 hours',
        '  | WHERE kibana.alert.workflow_status IN ("open", "acknowledged")',
        '  | WHERE kibana.alert.building_block_type IS NULL',
        '  | SORT kibana.alert.risk_score DESC, @timestamp DESC',
        `  | LIMIT ${DEFAULT_SIZE}`,
        '  | KEEP',
        '      _id,',
        '      @timestamp,',
        '      host.name,',
        '      user.name',
      ].join('\n');

      expect(result).toBe(expectedQuery);
    });
  });

  describe('edge cases', () => {
    it('handles empty allowedFields by only including _id and @timestamp', async () => {
      const result = await buildDefaultEsqlQuery({
        allowedFields: [],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(result).toContain('  | KEEP');
      expect(result).toContain('      _id,');
      expect(result).toContain('      @timestamp');
      expect(mockEsClient.fieldCaps).not.toHaveBeenCalled();
    });

    it('uses the spaceId to construct the default alertsIndexPattern', async () => {
      (mockEsClient.fieldCaps as jest.Mock).mockResolvedValueOnce(
        mockFieldCapsResponse(['host.name'])
      );

      const result = await buildDefaultEsqlQuery({
        allowedFields: ['host.name'],
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: 'my-custom-space',
      });

      expect(result).toContain('FROM .alerts-security.alerts-my-custom-space');
      expect(result).toContain('    METADATA _id');
    });
  });
});
