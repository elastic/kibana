/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SuperTest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { replaceParams } from '@kbn/openapi-common/shared';

import { RuleMigration } from '@kbn/security-solution-plugin/common/siem_migrations/model/rule_migration.gen';
import { INDEX_PATTERN as SIEM_MIGRATIONS_INDEX_PATTERN } from '@kbn/security-solution-plugin/server/lib/siem_migrations/rules/data/rule_migrations_data_service';
import { SIEM_RULE_MIGRATION_PATH } from '@kbn/security-solution-plugin/common/siem_migrations/constants';
import { GetRuleMigrationResponse } from '@kbn/security-solution-plugin/common/siem_migrations/model/api/rules/rule_migration.gen';

const SIEM_MIGRATIONS_RULES_INDEX_PATTERN = `${SIEM_MIGRATIONS_INDEX_PATTERN}-rules-default`;

export type RuleMigrationDocument = Omit<RuleMigration, 'id'>;

const migrationRuleDocument: RuleMigrationDocument = {
  '@timestamp': '2025-01-13T15:17:43.571Z',
  migration_id: '25a24356-3aab-401b-a73c-905cb8bf7a6d',
  original_rule: {
    id: 'https://127.0.0.1:8089/servicesNS/nobody/SA-AccessProtection/saved/searches/Access%20-%20Default%20Account%20Usage%20-%20Rule',
    vendor: 'splunk',
    title: 'Access - Default Account Usage - Rule',
    description:
      'Discovers use of default accounts (such as admin, administrator, etc.). Default accounts have default passwords and are therefore commonly targeted by attackers using brute force attack tools.',
    query:
      '| from datamodel:"Authentication"."Successful_Default_Authentication" | stats max("_time") as "lastTime",values("tag") as "tag",count by "dest","user","app"',
    query_language: 'spl',
    annotations: {
      mitre_attack: ['T1078'],
    },
  },
  status: 'completed',
  created_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
  updated_by: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
  updated_at: '2025-01-13T15:39:48.729Z',
  comments: [
    '## Prebuilt Rule Matching Summary\nThe Splunk rule "Access - Default Account Usage - Rule" is intended to discover the use of default accounts, which are commonly targeted by attackers using brute force attack tools. However, none of the provided Elastic Prebuilt Rules specifically address the detection of default account usage. The closest matches involve brute force attacks in general, but they do not specifically focus on default accounts. Therefore, no suitable match was found.',
    '## Integration Matching Summary\nNo related integration found.',
    '## Translation Summary\n\nThe provided Splunk SPL query was analyzed and translated into the equivalent ES|QL query. Here is a breakdown of the process:\n\n### Original SPL Query\n```splunk-spl\n| from datamodel:"Authentication"."Successful_Default_Authentication" \n| stats max("_time") as "lastTime",\nvalues("tag") as "tag",\ncount by "dest","user","app"\n```\n\n### Key SPL Components and Their ES|QL Equivalents:\n1. **Data Model**: `from datamodel:"Authentication"."Successful_Default_Authentication"` is not directly translatable to ES|QL. Instead, we use `FROM logs-*` to define the data source.\n2. **Stats Aggregation**: The `stats max("_time") as "lastTime", values("tag") as "tag", count by "dest","user","app"` was translated as follows:\n   - `max(_time) as lastTime` to find the latest time.\n   - `values(tag) as tag` to collect all values in the `tag` field.\n   - `count by dest, user, app` to count the occurrences grouped by `dest`, `user`, and `app`.\n\nBy analyzing these key components and their ES|QL equivalents, the translated query achieves the same results as the SPL query while adhering to the ES|QL syntax and structure.',
  ],
  translation_result: 'partial',
  elastic_rule: {
    severity: 'low',
    risk_score: 21,
    integration_ids: [''],
    query:
      'FROM [indexPattern]\n| STATS lastTime = max(_time), tag = values(tag), count BY dest, user, app',
    description:
      'Discovers use of default accounts (such as admin, administrator, etc.). Default accounts have default passwords and are therefore commonly targeted by attackers using brute force attack tools.',
    query_language: 'esql',
    title: 'Access - Default Account Usage - Rule',
  },
};

export const getMigrationRuleDocument = (
  overrideParams: Partial<RuleMigrationDocument>
): RuleMigrationDocument => ({
  ...migrationRuleDocument,
  ...overrideParams,
});

export const createMigrationRules = async (
  es: Client,
  rules: RuleMigrationDocument[]
): Promise<void> => {
  const createdAt = new Date().toISOString();
  await es.bulk({
    refresh: 'wait_for',
    operations: rules.flatMap((ruleMigration) => [
      { create: { _index: SIEM_MIGRATIONS_RULES_INDEX_PATTERN } },
      {
        ...ruleMigration,
        '@timestamp': createdAt,
        updated_at: createdAt,
      },
    ]),
  });
};

export const deleteAllMigrationRules = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: [SIEM_MIGRATIONS_RULES_INDEX_PATTERN],
    body: {
      query: {
        match_all: {},
      },
    },
    ignore_unavailable: true,
    refresh: true,
  });
};

const assertStatusCode = (statusCode: number, response: SuperTest.Response) => {
  if (response.status !== statusCode) {
    throw new Error(
      `Expected status code ${statusCode}, but got ${response.statusCode} \n` + response.text
    );
  }
};

export const migrationRulesRouteHelpersFactory = (supertest: SuperTest.Agent) => {
  return {
    get: async (
      migrationId: string,
      expectStatusCode: number = 200
    ): Promise<{ body: GetRuleMigrationResponse }> => {
      const response = await supertest
        .get(replaceParams(SIEM_RULE_MIGRATION_PATH, { migration_id: migrationId }))
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send();

      assertStatusCode(expectStatusCode, response);

      return response;
    },
  };
};
