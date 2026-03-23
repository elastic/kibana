/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import type {
  GetRuleMigrationRulesResponse,
  GetRuleMigrationTranslationStatsResponse,
} from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { RuleMigrationStats } from '../../rules/types';
import { MigrationSource } from '../types';

const getMockMigrationResultRule = ({
  migrationId,
  translationResult = 'full',
  status = 'completed',
}: {
  migrationId: string;
  status?: GetRuleMigrationRulesResponse['data'][number]['status'];
  translationResult?: GetRuleMigrationRulesResponse['data'][number]['translation_result'];
}): GetRuleMigrationRulesResponse['data'][number] => {
  const ruleId = uuidv4();
  return {
    migration_id: migrationId,
    original_rule: {
      id: ruleId,
      vendor: 'splunk',
      title: ` 'Rule Title -  ${ruleId}'`,
      description: `Rule Title Description - ${ruleId}`,
      query: 'some query',
      query_language: 'spl',
    },
    '@timestamp': '2025-03-06T15:00:01.036Z',
    status,
    created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
    updated_at: '2025-03-06T15:01:37.321Z',
    comments: [
      {
        created_at: '2025-03-06T15:01:06.390Z',
        message: '## Prebuilt Rule Matching Summary\nNo related prebuilt rule found.',
        created_by: 'assistant',
      },
    ],
    translation_result: translationResult,
    elastic_rule: {
      severity: 'low',
      risk_score: 21,
      query:
        'FROM index metadata _id,_version,_index\n| WHERE MATCH(host.hostname, "vendor_sales")',
      description: `Converted Splunk Rule to Elastic Rule - ${ruleId}`,
      query_language: 'esql',
      title: `Converted Splunk Rule - ${ruleId}`,
      integration_ids: ['endpoint'],
    },
    id: ruleId,
  };
};

export const mockedMigrationLatestStatsData: RuleMigrationStats[] = [
  {
    id: '1',
    status: SiemMigrationTaskStatus.FINISHED,
    items: {
      total: 1,
      pending: 0,
      processing: 0,
      completed: 1,
      failed: 0,
    },
    last_updated_at: '2025-03-06T15:01:37.321Z',
    created_at: '2025-03-06T15:01:37.321Z',
    name: 'test',
    vendor: MigrationSource.SPLUNK,
  },
  {
    id: '2',
    status: SiemMigrationTaskStatus.FINISHED,
    items: {
      total: 2,
      pending: 0,
      processing: 0,
      completed: 2,
      failed: 0,
    },
    name: 'test',
    created_at: '2025-03-06T15:01:37.321Z',
    last_updated_at: '2025-03-06T15:01:37.321Z',
    vendor: MigrationSource.QRADAR,
  },
];

export const mockedMigrationResultsObj: Record<string, GetRuleMigrationRulesResponse> = {
  '1': {
    total: 2,
    data: [
      getMockMigrationResultRule({
        migrationId: '1',
        translationResult: 'full',
        status: 'completed',
      }),
      getMockMigrationResultRule({
        migrationId: '1',
        translationResult: 'untranslatable',
        status: 'failed',
      }),
    ],
  },
};

export const mockedMigrationTranslationStats: Record<
  string,
  GetRuleMigrationTranslationStatsResponse
> = {
  '1': {
    id: '1',
    rules: {
      total: 2,
      success: {
        total: 2,
        result: {
          full: 1,
          partial: 0,
          untranslatable: 1,
        },
        installable: 1,
        prebuilt: 0,
        missing_index: 0,
      },
      failed: 0,
    },
  },
};

const mockRefreshStats = jest.fn();
export const mockedLatestStatsEmpty = {
  data: [],
  isLoading: false,
  refreshStats: mockRefreshStats,
};

export const mockedLatestStats = {
  ...mockedLatestStatsEmpty,
  data: mockedMigrationLatestStatsData,
};
