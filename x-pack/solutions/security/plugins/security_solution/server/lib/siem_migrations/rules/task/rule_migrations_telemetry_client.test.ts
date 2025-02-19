/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { SiemMigrationTelemetryClient } from './rule_migrations_telemetry_client';
import type { RuleMigrationIntegration, RuleMigrationPrebuiltRule } from '../types';
import type { MigrateRuleState } from './agent/types';

const translationResultWithMatchMock = {
  translation_result: 'full',
  elastic_rule: { prebuilt_rule_id: 'testprebuiltid' },
} as MigrateRuleState;
const translationResultMock = {
  translation_result: 'partial',
} as MigrateRuleState;
const stats = { completed: 2, failed: 2 };
const preFilterRulesMock: RuleMigrationPrebuiltRule[] = [
  {
    rule_id: 'rule1id',
    name: 'rule1',
    description: 'rule1description',
    elser_embedding: 'rule1embedding',
    mitre_attack_ids: ['MitreID1'],
  },
  {
    rule_id: 'rule2id',
    name: 'rule2',
    description: 'rule2description',
    elser_embedding: 'rule1embedding',
  },
];

const postFilterRuleMock: RuleMigrationPrebuiltRule = {
  rule_id: 'rule1id',
  name: 'rule1',
  description: 'rule1description',
  elser_embedding: 'rule1embedding',
  mitre_attack_ids: ['MitreID1'],
};

const postFilterIntegrationMocks: RuleMigrationIntegration = {
  id: 'testIntegration1',
  title: 'testIntegration1',
  description: 'testDescription1',
  data_streams: [{ dataset: 'testds1', title: 'testds1', index_pattern: 'testds1-pattern' }],
  elser_embedding: 'testEmbedding',
};

const preFilterIntegrationMocks: RuleMigrationIntegration[] = [
  {
    id: 'testIntegration1',
    title: 'testIntegration1',
    description: 'testDescription1',
    data_streams: [{ dataset: 'testds1', title: 'testds1', index_pattern: 'testds1-pattern' }],
    elser_embedding: 'testEmbedding',
  },
  {
    id: 'testIntegration2',
    title: 'testIntegration2',
    description: 'testDescription2',
    data_streams: [{ dataset: 'testds2', title: 'testds2', index_pattern: 'testds2-pattern' }],
    elser_embedding: 'testEmbedding',
  },
];

const mockTelemetry = coreMock.createSetup().analytics;
const mockLogger = loggerMock.create();
const siemTelemetryClient = new SiemMigrationTelemetryClient(
  mockTelemetry,
  mockLogger,
  'testmigration',
  'testModel'
);

describe('siemMigrationTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    const date = '2024-01-28T04:20:02.394Z';
    jest.setSystemTime(new Date(date));
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  it('start/end migration with error', async () => {
    const endSiemMigration = siemTelemetryClient.startSiemMigration();
    const error = new Error('test');
    endSiemMigration({ stats, error });
    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('siem_migrations_migration_failure', {
      completed: 2,
      duration: 0,
      error: 'test',
      failed: 2,
      migrationId: 'testmigration',
      model: 'testModel',
      total: 4,
    });
  });
  it('start/end migration success', async () => {
    const endSiemMigration = siemTelemetryClient.startSiemMigration();

    endSiemMigration({ stats });
    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('siem_migrations_migration_success', {
      completed: 2,
      duration: 0,
      failed: 2,
      migrationId: 'testmigration',
      model: 'testModel',
      total: 4,
    });
  });
  it('start/end rule translation with error', async () => {
    const endRuleTranslation = siemTelemetryClient.startRuleTranslation();
    const error = new Error('test');

    endRuleTranslation({ error });
    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(
      'siem_migrations_rule_translation_failure',
      {
        error: 'test',
        migrationId: 'testmigration',
        model: 'testModel',
      }
    );
  });
  it('start/end rule translation success with prebuilt', async () => {
    const endRuleTranslation = siemTelemetryClient.startRuleTranslation();

    endRuleTranslation({ migrationResult: translationResultWithMatchMock });
    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(
      'siem_migrations_rule_translation_success',
      {
        migrationId: 'testmigration',
        model: 'testModel',
        duration: 0,
        prebuiltMatch: true,
        translationResult: 'full',
      }
    );
  });
  it('start/end rule translation success without prebuilt', async () => {
    const endRuleTranslation = siemTelemetryClient.startRuleTranslation();

    endRuleTranslation({ migrationResult: translationResultMock });
    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(
      'siem_migrations_rule_translation_success',
      {
        migrationId: 'testmigration',
        model: 'testModel',
        prebuiltMatch: false,
        translationResult: 'partial',
        duration: 0,
      }
    );
  });
  it('reportIntegrationMatch with a match', async () => {
    siemTelemetryClient.reportIntegrationsMatch({
      preFilterIntegrations: preFilterIntegrationMocks,
      postFilterIntegration: postFilterIntegrationMocks,
    });
    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('siem_migrations_integration_match', {
      migrationId: 'testmigration',
      model: 'testModel',
      postFilterIntegrationCount: 1,
      postFilterIntegrationName: 'testIntegration1',
      preFilterIntegrationCount: 2,
      preFilterIntegrationNames: ['testIntegration1', 'testIntegration2'],
    });
  });
  it('reportIntegrationMatch without postFilter matches', async () => {
    siemTelemetryClient.reportIntegrationsMatch({
      preFilterIntegrations: preFilterIntegrationMocks,
    });
    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('siem_migrations_integration_match', {
      migrationId: 'testmigration',
      model: 'testModel',
      postFilterIntegrationCount: 0,
      postFilterIntegrationName: '',
      preFilterIntegrationCount: 2,
      preFilterIntegrationNames: ['testIntegration1', 'testIntegration2'],
    });
  });
  it('reportPrebuiltRulesMatch with a match', async () => {
    siemTelemetryClient.reportPrebuiltRulesMatch({
      preFilterRules: preFilterRulesMock,
      postFilterRule: postFilterRuleMock,
    });
    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('siem_migrations_prebuilt_rules_match', {
      migrationId: 'testmigration',
      model: 'testModel',
      postFilterRuleCount: 1,
      postFilterRuleName: 'rule1id',
      preFilterRuleCount: 2,
      preFilterRuleNames: ['rule1id', 'rule2id'],
    });
  });
  it('reportPrebuiltRulesMatch without postFilter matches', async () => {
    siemTelemetryClient.reportPrebuiltRulesMatch({
      preFilterRules: preFilterRulesMock,
    });
    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('siem_migrations_prebuilt_rules_match', {
      migrationId: 'testmigration',
      model: 'testModel',
      postFilterRuleCount: 0,
      postFilterRuleName: '',
      preFilterRuleCount: 2,
      preFilterRuleNames: ['rule1id', 'rule2id'],
    });
  });
});
