/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ModeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { setUpRuleUpgrade } from '../../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import { performUpgradePrebuiltRules } from '../../../../../utils';

export function upgradeAllRules({ getService }: FtrProviderContext): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');
  const deps = {
    es,
    supertest,
    log,
  };

  const ruleFields = [
    QUERY_RULE_FIELDS,
    SAVED_QUERY_RULE_FIELDS,
    EQL_RULE_FIELDS,
    ESQL_RULE_FIELDS,
    THREAT_MATCH_RULE_FIELDS,
    THRESHOLD_RULE_FIELDS,
    ML_RULE_FIELDS,
    NEW_TERMS_RULE_FIELDS,
  ];

  describe('(mode ALL_RULES)', () => {
    for (const { versionA: fieldsVersionA, versionB: fieldsVersionB } of ruleFields) {
      describe(`rule type "${fieldsVersionA.type}"`, () => {
        it('upgrades all upgreadeable rule fields to their BASE versions', async () => {
          await setUpRuleUpgrade({
            assets: {
              installed: {
                ...fieldsVersionA,
                rule_id: 'rule_1',
                version: 1,
              },
              patch: {},
              upgrade: {
                ...fieldsVersionB,
                rule_id: 'rule_1',
                version: 2,
              },
            },
            deps,
          });

          const response = await performUpgradePrebuiltRules(es, supertest, {
            mode: ModeEnum.ALL_RULES,
            pick_version: 'BASE',
          });
          const upgradedRule = await securitySolutionApi.readRule({ query: { rule_id: 'rule_1' } });

          expect(response.results.updated).toEqual([
            expect.objectContaining({
              ...fieldsVersionA,
              rule_id: 'rule_1',
              version: 2,
            }),
          ]);
          expect(upgradedRule.body).toMatchObject({
            ...fieldsVersionA,
            rule_id: 'rule_1',
            version: 2,
          });
        });

        it('upgrades all upgreadeable rule fields to their TARGET versions', async () => {
          await setUpRuleUpgrade({
            assets: {
              installed: {
                ...fieldsVersionA,
                rule_id: 'rule_1',
                version: 1,
              },
              patch: {},
              upgrade: {
                ...fieldsVersionB,
                rule_id: 'rule_1',
                version: 2,
              },
            },
            deps,
          });

          const response = await performUpgradePrebuiltRules(es, supertest, {
            mode: ModeEnum.ALL_RULES,
            pick_version: 'TARGET',
          });
          const upgradedRule = await securitySolutionApi.readRule({ query: { rule_id: 'rule_1' } });

          expect(response.results.updated).toMatchObject([
            expect.objectContaining({
              ...fieldsVersionB,
              rule_id: 'rule_1',
              version: 2,
            }),
          ]);
          expect(upgradedRule.body).toMatchObject({
            ...fieldsVersionB,
            rule_id: 'rule_1',
            version: 2,
          });
        });
      });
    }
  });
}

const QUERY_RULE_FIELDS = {
  versionA: {
    type: 'query' as const,
    name: 'Custom query rule name',
    description: 'Custom query rule description',
    tags: ['tagA'],
    severity: 'low' as const,
    severity_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        severity: 'low',
        value: '10',
      } as const,
    ],
    risk_score: 10,
    risk_score_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        value: '10',
        risk_score: 10,
      } as const,
    ],
    references: ['http://url-1'],
    false_positives: ['example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticA',
          id: 'tacticA',
          reference: 'reference',
        },
      },
    ],
    note: 'Note 1',
    setup: 'Setup 1',
    related_integrations: [
      {
        package: 'packageA',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldA',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '5m',
    from: 'now-10m',
    to: 'now',
    max_signals: 100,
    rule_name_override: 'fieldA',
    timestamp_override: 'fieldA',
    timeline_id: 'A',
    timeline_title: 'timelineA',
    building_block_type: 'default',
    investigation_fields: { field_names: ['fieldA'] },
    index: ['indexA'],
    alert_suppression: { group_by: ['fieldA'] },
    query: 'process.name:*.exe',
    language: 'kuery' as const,
  },
  versionB: {
    type: 'query' as const,
    name: 'Updated custom query rule name',
    description: 'Updated custom query rule description',
    tags: ['tagB'],
    severity: 'medium' as const,
    severity_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        severity: 'medium',
        value: '20',
      } as const,
    ],
    risk_score: 20,
    risk_score_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        value: '20',
        risk_score: 20,
      } as const,
    ],
    references: ['http://updated-url-1'],
    false_positives: ['updated-example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticB',
          id: 'tacticB',
          reference: 'reference',
        },
      },
    ],
    note: 'Updated note 1',
    setup: 'Updated setup 1',
    related_integrations: [
      {
        package: 'packageB',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldB',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '10m',
    from: 'now-20m',
    to: 'now',
    max_signals: 200,
    rule_name_override: 'fieldB',
    timestamp_override: 'fieldB',
    timeline_id: 'B',
    timeline_title: 'timelineB',
    investigation_fields: { field_names: ['fieldB'] },
    index: ['indexB'],
    alert_suppression: { group_by: ['fieldB'] },
    query: 'process.name:*.sys',
    language: 'kuery' as const,
  },
};

const SAVED_QUERY_RULE_FIELDS = {
  versionA: {
    type: 'saved_query' as const,
    name: 'Saved query rule name',
    description: 'Saved query rule description',
    tags: ['tagA'],
    severity: 'low' as const,
    severity_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        severity: 'low',
        value: '10',
      } as const,
    ],
    risk_score: 10,
    risk_score_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        value: '10',
        risk_score: 10,
      } as const,
    ],
    references: ['http://url-1'],
    false_positives: ['example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticA',
          id: 'tacticA',
          reference: 'reference',
        },
      },
    ],
    note: 'Note 1',
    setup: 'Setup 1',
    related_integrations: [
      {
        package: 'packageA',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldA',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '5m',
    from: 'now-10m',
    to: 'now',
    max_signals: 100,
    rule_name_override: 'fieldA',
    timestamp_override: 'fieldA',
    timeline_id: 'A',
    timeline_title: 'timelineA',
    building_block_type: 'default',
    investigation_fields: { field_names: ['fieldA'] },
    index: ['indexA'],
    alert_suppression: { group_by: ['fieldA'] },
    saved_id: 'saved_query_idA',
  },
  versionB: {
    type: 'saved_query' as const,
    name: 'Updated saved query rule name',
    description: 'Updated saved query rule description',
    tags: ['tagB'],
    severity: 'medium' as const,
    severity_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        severity: 'medium',
        value: '20',
      } as const,
    ],
    risk_score: 20,
    risk_score_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        value: '20',
        risk_score: 20,
      } as const,
    ],
    references: ['http://updated-url-1'],
    false_positives: ['updated-example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticB',
          id: 'tacticB',
          reference: 'reference',
        },
      },
    ],
    note: 'Updated note 1',
    setup: 'Updated setup 1',
    related_integrations: [
      {
        package: 'packageB',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldB',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '10m',
    from: 'now-20m',
    to: 'now',
    max_signals: 200,
    rule_name_override: 'fieldB',
    timestamp_override: 'fieldB',
    timeline_id: 'B',
    timeline_title: 'timelineB',
    investigation_fields: { field_names: ['fieldB'] },
    index: ['indexB'],
    alert_suppression: { group_by: ['fieldB'] },
    saved_id: 'saved_query_idB',
  },
};

const EQL_RULE_FIELDS = {
  versionA: {
    type: 'eql' as const,
    name: 'EQL rule name',
    description: 'EQL rule description',
    tags: ['tagA'],
    severity: 'low' as const,
    severity_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        severity: 'low',
        value: '10',
      } as const,
    ],
    risk_score: 10,
    risk_score_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        value: '10',
        risk_score: 10,
      } as const,
    ],
    references: ['http://url-1'],
    false_positives: ['example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticA',
          id: 'tacticA',
          reference: 'reference',
        },
      },
    ],
    note: 'Note 1',
    setup: 'Setup 1',
    related_integrations: [
      {
        package: 'packageA',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldA',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '5m',
    from: 'now-10m',
    to: 'now',
    max_signals: 100,
    rule_name_override: 'fieldA',
    timestamp_override: 'fieldA',
    timeline_id: 'A',
    timeline_title: 'timelineA',
    building_block_type: 'default',
    investigation_fields: { field_names: ['fieldA'] },
    index: ['indexA'],
    alert_suppression: { group_by: ['fieldA'] },
    query: 'any where true',
  },
  versionB: {
    type: 'eql' as const,
    name: 'Updated eql rule name',
    description: 'Updated eql rule description',
    tags: ['tagB'],
    severity: 'medium' as const,
    severity_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        severity: 'medium',
        value: '20',
      } as const,
    ],
    risk_score: 20,
    risk_score_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        value: '20',
        risk_score: 20,
      } as const,
    ],
    references: ['http://updated-url-1'],
    false_positives: ['updated-example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticB',
          id: 'tacticB',
          reference: 'reference',
        },
      },
    ],
    note: 'Updated note 1',
    setup: 'Updated setup 1',
    related_integrations: [
      {
        package: 'packageB',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldB',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '10m',
    from: 'now-20m',
    to: 'now',
    max_signals: 200,
    rule_name_override: 'fieldB',
    timestamp_override: 'fieldB',
    timeline_id: 'B',
    timeline_title: 'timelineB',
    investigation_fields: { field_names: ['fieldB'] },
    index: ['indexB'],
    alert_suppression: { group_by: ['fieldB'] },
    query: 'process where process.name == "regsvr32.exe"',
  },
};

const ESQL_RULE_FIELDS = {
  versionA: {
    type: 'esql' as const,
    name: 'Esql rule name',
    description: 'Esql rule description',
    tags: ['tagA'],
    severity: 'low' as const,
    severity_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        severity: 'low',
        value: '10',
      } as const,
    ],
    risk_score: 10,
    risk_score_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        value: '10',
        risk_score: 10,
      } as const,
    ],
    references: ['http://url-1'],
    false_positives: ['example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticA',
          id: 'tacticA',
          reference: 'reference',
        },
      },
    ],
    note: 'Note 1',
    setup: 'Setup 1',
    related_integrations: [
      {
        package: 'packageA',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldA',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '5m',
    from: 'now-10m',
    to: 'now',
    max_signals: 100,
    rule_name_override: 'fieldA',
    timestamp_override: 'fieldA',
    timeline_id: 'A',
    timeline_title: 'timelineA',
    building_block_type: 'default',
    investigation_fields: { field_names: ['fieldA'] },
    alert_suppression: { group_by: ['fieldA'] },
    query: 'FROM indexA METADATA _id',
    language: 'esql' as const,
  },
  versionB: {
    type: 'esql' as const,
    name: 'Updated esql rule name',
    description: 'Updated esql rule description',
    tags: ['tagB'],
    severity: 'medium' as const,
    severity_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        severity: 'medium',
        value: '20',
      } as const,
    ],
    risk_score: 20,
    risk_score_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        value: '20',
        risk_score: 20,
      } as const,
    ],
    references: ['http://updated-url-1'],
    false_positives: ['updated-example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticB',
          id: 'tacticB',
          reference: 'reference',
        },
      },
    ],
    note: 'Updated note 1',
    setup: 'Updated setup 1',
    related_integrations: [
      {
        package: 'packageB',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldB',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '10m',
    from: 'now-20m',
    to: 'now',
    max_signals: 200,
    rule_name_override: 'fieldB',
    timestamp_override: 'fieldB',
    timeline_id: 'B',
    timeline_title: 'timelineB',
    investigation_fields: { field_names: ['fieldB'] },
    alert_suppression: { group_by: ['fieldB'] },
    query: 'FROM indexB METADATA _id',
    language: 'esql' as const,
  },
};

const THREAT_MATCH_RULE_FIELDS = {
  versionA: {
    type: 'threat_match' as const,
    name: 'Threat match rule name',
    description: 'Threat match rule description',
    tags: ['tagA'],
    severity: 'low' as const,
    severity_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        severity: 'low',
        value: '10',
      } as const,
    ],
    risk_score: 10,
    risk_score_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        value: '10',
        risk_score: 10,
      } as const,
    ],
    references: ['http://url-1'],
    false_positives: ['example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticA',
          id: 'tacticA',
          reference: 'reference',
        },
      },
    ],
    note: 'Note 1',
    setup: 'Setup 1',
    related_integrations: [
      {
        package: 'packageA',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldA',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '5m',
    from: 'now-10m',
    to: 'now',
    max_signals: 100,
    rule_name_override: 'fieldA',
    timestamp_override: 'fieldA',
    timeline_id: 'A',
    timeline_title: 'timelineA',
    building_block_type: 'default',
    investigation_fields: { field_names: ['fieldA'] },
    index: ['indexA'],
    alert_suppression: { group_by: ['fieldA'] },
    threat_index: ['indexA'],
    threat_query: 'process.name:*.exe',
    threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' } as const] }],
    threat_indicator_path: 'fieldA',
  },
  versionB: {
    type: 'threat_match' as const,
    name: 'Updated threat match rule name',
    description: 'Updated threat match rule description',
    tags: ['tagB'],
    severity: 'medium' as const,
    severity_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        severity: 'medium',
        value: '20',
      } as const,
    ],
    risk_score: 20,
    risk_score_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        value: '20',
        risk_score: 20,
      } as const,
    ],
    references: ['http://updated-url-1'],
    false_positives: ['updated-example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticB',
          id: 'tacticB',
          reference: 'reference',
        },
      },
    ],
    note: 'Updated note 1',
    setup: 'Updated setup 1',
    related_integrations: [
      {
        package: 'packageB',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldB',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '10m',
    from: 'now-20m',
    to: 'now',
    max_signals: 200,
    rule_name_override: 'fieldB',
    timestamp_override: 'fieldB',
    timeline_id: 'B',
    timeline_title: 'timelineB',
    investigation_fields: { field_names: ['fieldB'] },
    index: ['indexB'],
    alert_suppression: { group_by: ['fieldB'] },
    threat_index: ['indexB'],
    threat_query: 'process.name:*.sys',
    threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldY' } as const] }],
    threat_indicator_path: 'fieldB',
  },
};

const THRESHOLD_RULE_FIELDS = {
  versionA: {
    type: 'threshold' as const,
    name: 'Threshold rule name',
    description: 'Threshold rule description',
    tags: ['tagA'],
    severity: 'low' as const,
    severity_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        severity: 'low',
        value: '10',
      } as const,
    ],
    risk_score: 10,
    risk_score_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        value: '10',
        risk_score: 10,
      } as const,
    ],
    references: ['http://url-1'],
    false_positives: ['example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticA',
          id: 'tacticA',
          reference: 'reference',
        },
      },
    ],
    note: 'Note 1',
    setup: 'Setup 1',
    related_integrations: [
      {
        package: 'packageA',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldA',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '5m',
    from: 'now-10m',
    to: 'now',
    max_signals: 100,
    rule_name_override: 'fieldA',
    timestamp_override: 'fieldA',
    timeline_id: 'A',
    timeline_title: 'timelineA',
    building_block_type: 'default',
    investigation_fields: { field_names: ['fieldA'] },
    index: ['indexA'],
    alert_suppression: { duration: { value: 2, unit: 'h' } as const },
    query: 'process.name:*.exe',
    language: 'kuery' as const,
    threshold: { value: 10, field: ['fieldA'] },
  },
  versionB: {
    type: 'threshold' as const,
    name: 'Updated threshold rule name',
    description: 'Updated threshold rule description',
    tags: ['tagB'],
    severity: 'medium' as const,
    severity_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        severity: 'medium',
        value: '20',
      } as const,
    ],
    risk_score: 20,
    risk_score_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        value: '20',
        risk_score: 20,
      } as const,
    ],
    references: ['http://updated-url-1'],
    false_positives: ['updated-example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticB',
          id: 'tacticB',
          reference: 'reference',
        },
      },
    ],
    note: 'Updated note 1',
    setup: 'Updated setup 1',
    related_integrations: [
      {
        package: 'packageB',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldB',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '10m',
    from: 'now-20m',
    to: 'now',
    max_signals: 200,
    rule_name_override: 'fieldB',
    timestamp_override: 'fieldB',
    timeline_id: 'B',
    timeline_title: 'timelineB',
    investigation_fields: { field_names: ['fieldB'] },
    index: ['indexB'],
    alert_suppression: { duration: { value: 2, unit: 'h' } as const },
    query: 'process.name:*.sys',
    language: 'kuery' as const,
    threshold: { value: 20, field: ['fieldB'] },
  },
};

const ML_RULE_FIELDS = {
  versionA: {
    type: 'machine_learning' as const,
    name: 'Machine learning rule name',
    description: 'Machine learning rule description',
    tags: ['tagA'],
    severity: 'low' as const,
    severity_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        severity: 'low',
        value: '10',
      } as const,
    ],
    risk_score: 10,
    risk_score_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        value: '10',
        risk_score: 10,
      } as const,
    ],
    references: ['http://url-1'],
    false_positives: ['example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticA',
          id: 'tacticA',
          reference: 'reference',
        },
      },
    ],
    note: 'Note 1',
    setup: 'Setup 1',
    related_integrations: [
      {
        package: 'packageA',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldA',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '5m',
    from: 'now-10m',
    to: 'now',
    max_signals: 100,
    rule_name_override: 'fieldA',
    timestamp_override: 'fieldA',
    timeline_id: 'A',
    timeline_title: 'timelineA',
    building_block_type: 'default',
    investigation_fields: { field_names: ['fieldA'] },
    alert_suppression: { group_by: ['fieldA'] },
    machine_learning_job_id: ['jobA'],
    anomaly_threshold: 10,
  },
  versionB: {
    type: 'machine_learning' as const,
    name: 'Updated machine learning rule name',
    description: 'Updated machine learning rule description',
    tags: ['tagB'],
    severity: 'medium' as const,
    severity_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        severity: 'medium',
        value: '20',
      } as const,
    ],
    risk_score: 20,
    risk_score_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        value: '20',
        risk_score: 20,
      } as const,
    ],
    references: ['http://updated-url-1'],
    false_positives: ['updated-example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticB',
          id: 'tacticB',
          reference: 'reference',
        },
      },
    ],
    note: 'Updated note 1',
    setup: 'Updated setup 1',
    related_integrations: [
      {
        package: 'packageB',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldB',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '10m',
    from: 'now-20m',
    to: 'now',
    max_signals: 200,
    rule_name_override: 'fieldB',
    timestamp_override: 'fieldB',
    timeline_id: 'B',
    timeline_title: 'timelineB',
    investigation_fields: { field_names: ['fieldB'] },
    alert_suppression: { group_by: ['fieldB'] },
    machine_learning_job_id: ['jobB'],
    anomaly_threshold: 20,
  },
};

const NEW_TERMS_RULE_FIELDS = {
  versionA: {
    type: 'new_terms' as const,
    name: 'New terms rule name',
    description: 'New terms rule description',
    tags: ['tagA'],
    severity: 'low' as const,
    severity_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        severity: 'low',
        value: '10',
      } as const,
    ],
    risk_score: 10,
    risk_score_mapping: [
      {
        field: 'fieldA',
        operator: 'equals',
        value: '10',
        risk_score: 10,
      } as const,
    ],
    references: ['http://url-1'],
    false_positives: ['example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticA',
          id: 'tacticA',
          reference: 'reference',
        },
      },
    ],
    note: 'Note 1',
    setup: 'Setup 1',
    related_integrations: [
      {
        package: 'packageA',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldA',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '5m',
    from: 'now-10m',
    to: 'now',
    max_signals: 100,
    rule_name_override: 'fieldA',
    timestamp_override: 'fieldA',
    timeline_id: 'A',
    timeline_title: 'timelineA',
    building_block_type: 'default',
    investigation_fields: { field_names: ['fieldA'] },
    index: ['indexA'],
    alert_suppression: { group_by: ['fieldA'] },
    query: 'process.name:*.exe',
    language: 'kuery' as const,
    new_terms_fields: ['fieldA'],
    history_window_start: 'now-1h',
  },
  versionB: {
    type: 'new_terms' as const,
    name: 'Updated new terms rule name',
    description: 'Updated new terms rule description',
    tags: ['tagB'],
    severity: 'medium' as const,
    severity_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        severity: 'medium',
        value: '20',
      } as const,
    ],
    risk_score: 20,
    risk_score_mapping: [
      {
        field: 'fieldB',
        operator: 'equals',
        value: '20',
        risk_score: 20,
      } as const,
    ],
    references: ['http://updated-url-1'],
    false_positives: ['updated-example1'],
    threat: [
      {
        framework: 'something',
        tactic: {
          name: 'tacticB',
          id: 'tacticB',
          reference: 'reference',
        },
      },
    ],
    note: 'Updated note 1',
    setup: 'Updated setup 1',
    related_integrations: [
      {
        package: 'packageB',
        version: '^1.0.0',
      },
    ],
    required_fields: [
      {
        name: 'fieldB',
        type: 'string',
        ecs: false,
      },
    ],
    interval: '10m',
    from: 'now-20m',
    to: 'now',
    max_signals: 200,
    rule_name_override: 'fieldB',
    timestamp_override: 'fieldB',
    timeline_id: 'B',
    timeline_title: 'timelineB',
    investigation_fields: { field_names: ['fieldB'] },
    index: ['indexB'],
    alert_suppression: { group_by: ['fieldB'] },
    query: 'process.name:*.sys',
    language: 'kuery' as const,
    new_terms_fields: ['fieldB'],
    history_window_start: 'now-2h',
  },
};
