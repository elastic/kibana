/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { coreMock } from '@kbn/core/server/mocks';
import type { ExperimentalFeatures } from '../../../common';
import type { SiemMigrationsService } from '../../lib/siem_migrations/siem_migrations_service';
import type { SecuritySolutionPluginStartDependencies } from '../../plugin_contract';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import {
  migrationTranslatedRuleGetTool,
  migrationTranslatedRulesSearchTool,
} from './migration_translated_rules_tools';

const migrationId = '11111111-1111-4111-8111-111111111111';

const ruleDocument = {
  id: 'rule-1',
  migration_id: migrationId,
  status: 'completed',
  translation_result: 'partial',
  elastic_rule: {
    title: 'PowerShell EncodedCommand',
    description: 'Encoded PowerShell',
    severity: 'high',
    risk_score: 73,
    query: 'FROM logs-* | WHERE powershell.encoded == true',
  },
  original_rule: {
    id: 'original-1',
    vendor: 'splunk',
    title: 'PowerShell EncodedCommand',
    description: 'Encoded PowerShell',
    query: 'index=main sourcetype=WinEventLog',
    query_language: 'spl',
  },
};

/**
 * These tools read through the canonical SIEM rule-migrations data client
 * (`siemMigrationsService.createRulesClient`), the same data layer the migration
 * HTTP routes use. They previously hand-rolled the per-space index name and the
 * ES queries with `esClient.asCurrentUser`, which duplicated that data layer
 * (index-name providers, per-space index creation, internal-user reads,
 * canonical filter DSL) and could drift from it.
 *
 * The assertions below pin the contract: the tool resolves the client from the
 * service for the current request and space, delegates the read to it, and never
 * touches Elasticsearch directly.
 */
describe('migration translated rules tools — canonical migrations client', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const experimentalFeatures = {
    automaticMigrationSkillsEnabled: true,
  } as ExperimentalFeatures;

  const itemsGet = jest.fn();
  const createRulesClient = jest.fn(() => ({
    data: { items: { get: itemsGet } },
  }));
  const siemMigrationsService = {
    createRulesClient,
  } as unknown as SiemMigrationsService;

  const getRulesClientWithRequest = jest.fn().mockResolvedValue({});
  const getActionsClientWithRequest = jest.fn().mockResolvedValue({});

  const searchTool = migrationTranslatedRulesSearchTool(
    mockCore,
    mockLogger,
    experimentalFeatures,
    siemMigrationsService
  );
  const getTool = migrationTranslatedRuleGetTool(
    mockCore,
    mockLogger,
    experimentalFeatures,
    siemMigrationsService
  );

  const handlerContext = createToolHandlerContext(mockRequest, mockEsClient, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();

    const coreStart = coreMock.createStart();
    (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
      username: 'elastic',
      profile_uid: 'profile-1',
    } as never);

    const startPlugins = {
      alerting: { getRulesClientWithRequest },
      actions: { getActionsClientWithRequest },
      inference: {},
      fleet: { packageService: {} },
    } as unknown as SecuritySolutionPluginStartDependencies;

    mockCore.getStartServices.mockResolvedValue([coreStart, startPlugins, {} as never]);
  });

  describe('migration_translated_rules_search', () => {
    it('resolves the canonical rules client for the current request and space', async () => {
      itemsGet.mockResolvedValue({ total: 0, data: [] });

      await searchTool.handler(
        { migration_id: migrationId, query: 'PowerShell', max_results: 20 },
        handlerContext
      );

      expect(createRulesClient).toHaveBeenCalledTimes(1);
      expect(createRulesClient).toHaveBeenCalledWith(
        expect.objectContaining({
          request: mockRequest,
          spaceId: 'default',
          currentUser: expect.objectContaining({ username: 'elastic' }),
          dependencies: expect.objectContaining({ experimentalFeatures }),
        })
      );
    });

    it('delegates the name search to the canonical client instead of querying ES directly', async () => {
      itemsGet.mockResolvedValue({ total: 1, data: [ruleDocument] });

      const response = (await searchTool.handler(
        { migration_id: migrationId, query: 'PowerShell', max_results: 5 },
        handlerContext
      )) as ToolHandlerStandardReturn;

      expect(itemsGet).toHaveBeenCalledTimes(1);
      const [calledMigrationId, options] = itemsGet.mock.calls[0];
      expect(calledMigrationId).toBe(migrationId);
      expect(options).toEqual({ filters: { searchTerm: 'PowerShell' }, size: 5 });

      const [result] = response.results as Array<{
        type: string;
        data: { migration_id: string; total: number; rules: Array<Record<string, unknown>> };
      }>;
      expect(result.type).toBe(ToolResultType.other);
      expect(result.data.migration_id).toBe(migrationId);
      expect(result.data.total).toBe(1);
      expect(result.data.rules).toEqual([
        expect.objectContaining({
          id: 'rule-1',
          migration_id: migrationId,
          translation_result: 'partial',
          // The rules are returned verbatim so prompts/skills keep reading the
          // same nested fields, e.g. `elastic_rule.query`.
          elastic_rule: expect.objectContaining({
            title: 'PowerShell EncodedCommand',
            severity: 'high',
            risk_score: 73,
            query: 'FROM logs-* | WHERE powershell.encoded == true',
          }),
        }),
      ]);

      expect(mockEsClient.asCurrentUser.search).not.toHaveBeenCalled();
    });

    it('lists the whole migration when no name filter is given', async () => {
      itemsGet.mockResolvedValue({ total: 0, data: [] });

      await searchTool.handler({ migration_id: migrationId, max_results: 20 }, handlerContext);

      const [calledMigrationId, options] = itemsGet.mock.calls[0];
      expect(calledMigrationId).toBe(migrationId);
      expect(options.filters.searchTerm).toBeUndefined();
      expect(options.size).toBe(20);
    });

    it('defaults max_results to 20 in the tool schema', () => {
      expect(searchTool.schema.parse({ migration_id: migrationId }).max_results).toBe(20);
    });

    it('reports a canonical client failure as a tool error', async () => {
      itemsGet.mockRejectedValue(new Error('index_not_found_exception'));

      const response = (await searchTool.handler(
        { migration_id: migrationId, max_results: 20 },
        handlerContext
      )) as ToolHandlerStandardReturn;

      const [result] = response.results as Array<{ type: string; data: { message: string } }>;
      expect(result.type).toBe(ToolResultType.error);
      expect(result.data.message).toContain('index_not_found_exception');
    });
  });

  describe('migration_translated_rule_get', () => {
    it('reads the rule through the canonical client, scoped to the migration', async () => {
      itemsGet.mockResolvedValue({ total: 1, data: [ruleDocument] });

      const response = (await getTool.handler(
        { migration_id: migrationId, rule_id: 'rule-1' },
        handlerContext
      )) as ToolHandlerStandardReturn;

      expect(itemsGet).toHaveBeenCalledWith(migrationId, {
        filters: { ids: ['rule-1'] },
        size: 1,
      });

      const [result] = response.results as Array<{
        type: string;
        data: Record<string, unknown>;
      }>;
      expect(result.type).toBe(ToolResultType.other);
      expect(result.data).toMatchObject({ id: 'rule-1', migration_id: migrationId });

      expect(mockEsClient.asCurrentUser.get).not.toHaveBeenCalled();
    });

    it('reports a rule outside the migration as an error', async () => {
      itemsGet.mockResolvedValue({ total: 0, data: [] });

      const response = (await getTool.handler(
        { migration_id: migrationId, rule_id: 'rule-from-another-migration' },
        handlerContext
      )) as ToolHandlerStandardReturn;

      expect(itemsGet).toHaveBeenCalledWith(migrationId, {
        filters: { ids: ['rule-from-another-migration'] },
        size: 1,
      });

      const [result] = response.results as Array<{ type: string; data: { message: string } }>;
      expect(result.type).toBe(ToolResultType.error);
      expect(result.data.message).toBe(
        `Rule rule-from-another-migration was not found in migration ${migrationId}.`
      );
    });
  });
});
