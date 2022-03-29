/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { KbnClient } from '@kbn/test';
import { ALERT_RULE_RULE_ID, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

import type { TransportResult } from '@elastic/elasticsearch';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import type {
  ListArray,
  NonEmptyEntriesArray,
  OsTypeArray,
} from '@kbn/securitysolution-io-ts-list-types';
import type {
  CreateExceptionListItemSchema,
  CreateExceptionListSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { ToolingLog } from '@kbn/dev-utils';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { SavedObjectReference } from 'kibana/server';
import { PrePackagedRulesAndTimelinesStatusSchema } from '../../plugins/security_solution/common/detection_engine/schemas/response';
import {
  CreateRulesSchema,
  UpdateRulesSchema,
  FullResponseSchema,
  QueryCreateSchema,
  EqlCreateSchema,
  ThresholdCreateSchema,
  PreviewRulesSchema,
  ThreatMatchCreateSchema,
  RulePreviewLogs,
  SavedQueryCreateSchema,
} from '../../plugins/security_solution/common/detection_engine/schemas/request';
import { signalsMigrationType } from '../../plugins/security_solution/server/lib/detection_engine/migrations/saved_objects';
import {
  RuleExecutionStatus,
  Status,
  SignalIds,
} from '../../plugins/security_solution/common/detection_engine/schemas/common';
import { RulesSchema } from '../../plugins/security_solution/common/detection_engine/schemas/response/rules_schema';
import {
  DETECTION_ENGINE_INDEX_URL,
  DETECTION_ENGINE_PREPACKAGED_URL,
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL,
  DETECTION_ENGINE_SIGNALS_MIGRATION_URL,
  INTERNAL_IMMUTABLE_KEY,
  INTERNAL_RULE_ID_KEY,
  SECURITY_TELEMETRY_URL,
  UPDATE_OR_CREATE_LEGACY_ACTIONS,
} from '../../plugins/security_solution/common/constants';
import { RACAlert } from '../../plugins/security_solution/server/lib/detection_engine/rule_types/types';
import { DetectionMetrics } from '../../plugins/security_solution/server/usage/detections/types';
import { LegacyRuleActions } from '../../plugins/security_solution/server/lib/detection_engine/rule_actions/legacy_types';

/**
 * This will remove server generated properties such as date times, etc...
 * @param rule Rule to pass in to remove typical server generated properties
 */
export const removeServerGeneratedProperties = (
  rule: FullResponseSchema
): Partial<FullResponseSchema> => {
  const {
    /* eslint-disable @typescript-eslint/naming-convention */
    id,
    created_at,
    updated_at,
    execution_summary,
    /* eslint-enable @typescript-eslint/naming-convention */
    ...removedProperties
  } = rule;
  return removedProperties;
};

/**
 * This will remove server generated properties such as date times, etc... including the rule_id
 * @param rule Rule to pass in to remove typical server generated properties
 */
export const removeServerGeneratedPropertiesIncludingRuleId = (
  rule: FullResponseSchema
): Partial<FullResponseSchema> => {
  const ruleWithRemovedProperties = removeServerGeneratedProperties(rule);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { rule_id, ...additionalRuledIdRemoved } = ruleWithRemovedProperties;
  return additionalRuledIdRemoved;
};

/**
 * This is a typical simple rule for testing that is easy for most basic testing
 * @param ruleId
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getSimpleRule = (ruleId = 'rule-1', enabled = false): QueryCreateSchema => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  enabled,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index: ['auditbeat-*'],
  type: 'query',
  query: 'user.name: root or user.name: admin',
});

/**
 * This is a typical simple preview rule for testing that is easy for most basic testing
 * @param ruleId
 * @param enabled The number of times the rule will be run through the executors. Defaulted to 20,
 * the execution time for the default interval time of 5m.
 */
export const getSimplePreviewRule = (
  ruleId = 'preview-rule-1',
  invocationCount = 20
): PreviewRulesSchema => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index: ['auditbeat-*'],
  type: 'query',
  query: 'user.name: root or user.name: admin',
  invocationCount,
});

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of signals.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation and testing by getting all the signals at once.
 * @param ruleId The optional ruleId which is rule-1 by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getRuleForSignalTesting = (
  index: string[],
  ruleId = 'rule-1',
  enabled = true
): QueryCreateSchema => ({
  name: 'Signal Testing Query',
  description: 'Tests a simple query',
  enabled,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index,
  type: 'query',
  query: '*:*',
  from: '1900-01-01T00:00:00.000Z',
});

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of Saved Query signals.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation for SavedQuery and testing by getting all the signals at once.
 * @param ruleId The optional ruleId which is threshold-rule by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getSavedQueryRuleForSignalTesting = (
  index: string[],
  ruleId = 'saved-query-rule',
  enabled = true
): SavedQueryCreateSchema => ({
  ...getRuleForSignalTesting(index, ruleId, enabled),
  type: 'saved_query',
  saved_id: 'abcd',
});

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of EQL signals.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation for EQL and testing by getting all the signals at once.
 * @param ruleId The optional ruleId which is eql-rule by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getEqlRuleForSignalTesting = (
  index: string[],
  ruleId = 'eql-rule',
  enabled = true
): EqlCreateSchema => ({
  ...getRuleForSignalTesting(index, ruleId, enabled),
  type: 'eql',
  language: 'eql',
  query: 'any where true',
});

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of Threat Match signals.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation for Threat Match and testing by getting all the signals at once.
 * @param ruleId The optional ruleId which is threshold-rule by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getThreatMatchRuleForSignalTesting = (
  index: string[],
  ruleId = 'threat-match-rule',
  enabled = true
): ThreatMatchCreateSchema => ({
  ...getRuleForSignalTesting(index, ruleId, enabled),
  type: 'threat_match',
  language: 'kuery',
  query: '*:*',
  threat_query: '*:*',
  threat_mapping: [
    // We match host.name against host.name
    {
      entries: [
        {
          field: 'host.name',
          value: 'host.name',
          type: 'mapping',
        },
      ],
    },
  ],
  threat_index: index, // match against same index for simplicity
});

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of Threshold signals.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation for Threshold and testing by getting all the signals at once.
 * @param ruleId The optional ruleId which is threshold-rule by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getThresholdRuleForSignalTesting = (
  index: string[],
  ruleId = 'threshold-rule',
  enabled = true
): ThresholdCreateSchema => ({
  ...getRuleForSignalTesting(index, ruleId, enabled),
  type: 'threshold',
  language: 'kuery',
  query: '*:*',
  threshold: {
    field: 'process.name',
    value: 21,
  },
});

export const getRuleForSignalTestingWithTimestampOverride = (
  index: string[],
  ruleId = 'rule-1',
  enabled = true,
  timestampOverride = 'event.ingested'
): QueryCreateSchema => ({
  name: 'Signal Testing Query',
  description: 'Tests a simple query',
  enabled,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index,
  type: 'query',
  query: '*:*',
  timestamp_override: timestampOverride,
  from: '1900-01-01T00:00:00.000Z',
});

/**
 * This is a typical simple rule for testing that is easy for most basic testing
 * @param ruleId The rule id
 * @param enabled Set to tru to enable it, by default it is off
 */
export const getSimpleRuleUpdate = (ruleId = 'rule-1', enabled = false): UpdateRulesSchema => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  enabled,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index: ['auditbeat-*'],
  type: 'query',
  query: 'user.name: root or user.name: admin',
});

/**
 * This is a representative ML rule payload as expected by the server
 * @param ruleId The rule id
 * @param enabled Set to tru to enable it, by default it is off
 */
export const getSimpleMlRule = (ruleId = 'rule-1', enabled = false): CreateRulesSchema => ({
  name: 'Simple ML Rule',
  description: 'Simple Machine Learning Rule',
  enabled,
  anomaly_threshold: 44,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  machine_learning_job_id: ['some_job_id'],
  type: 'machine_learning',
});

/**
 * This is a representative ML rule payload as expected by the server for an update
 * @param ruleId The rule id
 * @param enabled Set to tru to enable it, by default it is off
 */
export const getSimpleMlRuleUpdate = (ruleId = 'rule-1', enabled = false): UpdateRulesSchema => ({
  name: 'Simple ML Rule',
  description: 'Simple Machine Learning Rule',
  enabled,
  anomaly_threshold: 44,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  machine_learning_job_id: ['some_job_id'],
  type: 'machine_learning',
});

export const getSignalStatus = () => ({
  aggs: { statuses: { terms: { field: 'kibana.alert.workflow_status', size: 10 } } },
});

export const getQueryAllSignals = () => ({
  query: { match_all: {} },
});

export const getQuerySignalIds = (signalIds: SignalIds) => ({
  query: {
    terms: {
      _id: signalIds,
    },
  },
});

/**
 * Given an array of ruleIds for a test this will get the signals
 * created from that rule_id.
 * @param ruleIds The rule_id to search for signals
 */
export const getQuerySignalsRuleId = (ruleIds: string[]) => ({
  query: {
    terms: {
      [ALERT_RULE_RULE_ID]: ruleIds,
    },
  },
});

/**
 * Given an array of ids for a test this will get the signals
 * created from that rule's regular id.
 * @param ruleIds The rule_id to search for signals
 */
export const getQuerySignalsId = (ids: string[], size = 10) => ({
  size,
  query: {
    terms: {
      [ALERT_RULE_UUID]: ids,
    },
  },
});

export const setSignalStatus = ({
  signalIds,
  status,
}: {
  signalIds: SignalIds;
  status: Status;
}) => ({
  signal_ids: signalIds,
  status,
});

export const getSignalStatusEmptyResponse = () => ({
  timed_out: false,
  total: 0,
  updated: 0,
  deleted: 0,
  batches: 0,
  version_conflicts: 0,
  noops: 0,
  retries: { bulk: 0, search: 0 },
  throttled_millis: 0,
  requests_per_second: -1,
  throttled_until_millis: 0,
  failures: [],
});

/**
 * This is a typical simple rule for testing that is easy for most basic testing
 */
export const getSimpleRuleWithoutRuleId = (): CreateRulesSchema => {
  const simpleRule = getSimpleRule();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { rule_id, ...ruleWithoutId } = simpleRule;
  return ruleWithoutId;
};

/**
 * Useful for export_api testing to convert from a multi-part binary back to a string
 * @param res Response
 * @param callback Callback
 */
export const binaryToString = (res: any, callback: any): void => {
  res.setEncoding('binary');
  res.data = '';
  res.on('data', (chunk: any) => {
    res.data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(res.data));
  });
};

/**
 * This is the typical output of a simple rule that Kibana will output with all the defaults
 * except for the server generated properties.  Useful for testing end to end tests.
 */
export const getSimpleRuleOutput = (ruleId = 'rule-1', enabled = false): Partial<RulesSchema> => ({
  actions: [],
  author: [],
  created_by: 'elastic',
  description: 'Simple Rule Query',
  enabled,
  false_positives: [],
  from: 'now-6m',
  immutable: false,
  index: ['auditbeat-*'],
  interval: '5m',
  rule_id: ruleId,
  language: 'kuery',
  output_index: '.siem-signals-default',
  max_signals: 100,
  risk_score: 1,
  risk_score_mapping: [],
  name: 'Simple Rule Query',
  query: 'user.name: root or user.name: admin',
  references: [],
  severity: 'high',
  severity_mapping: [],
  updated_by: 'elastic',
  tags: [],
  to: 'now',
  type: 'query',
  threat: [],
  throttle: 'no_actions',
  exceptions_list: [],
  version: 1,
});

/**
 * This is the typical output of a simple rule preview, with errors and warnings coming up from the rule
 * execution process and a `previewId` generated server side for later preview querying
 *
 * @param previewId Rule id generated by the server itself
 * @param logs Errors and warnings returned by executor and route file, defaults to empty array
 */
export const getSimpleRulePreviewOutput = (
  previewId = undefined,
  logs: RulePreviewLogs[] = []
) => ({
  logs,
  previewId,
  isAborted: false,
});

export const resolveSimpleRuleOutput = (
  ruleId = 'rule-1',
  enabled = false
): Partial<RulesSchema> => ({ outcome: 'exactMatch', ...getSimpleRuleOutput(ruleId, enabled) });

/**
 * This is the typical output of a simple rule that Kibana will output with all the defaults except
 * for all the server generated properties such as created_by. Useful for testing end to end tests.
 */
export const getSimpleRuleOutputWithoutRuleId = (ruleId = 'rule-1'): Partial<RulesSchema> => {
  const rule = getSimpleRuleOutput(ruleId);
  const { rule_id: rId, ...ruleWithoutRuleId } = rule;
  return ruleWithoutRuleId;
};

/**
 * This is the typical output of a simple rule that Kibana will output with all the defaults except
 * for all the server generated properties such as created_by. Useful for testing end to end tests.
 */
export const resolveSimpleRuleOutputWithoutRuleId = (ruleId = 'rule-1'): Partial<RulesSchema> => {
  const rule = getSimpleRuleOutput(ruleId);
  const { rule_id: rId, ...ruleWithoutRuleId } = rule;
  return { outcome: 'exactMatch', ...ruleWithoutRuleId };
};

export const getSimpleMlRuleOutput = (ruleId = 'rule-1'): Partial<RulesSchema> => {
  const rule = getSimpleRuleOutput(ruleId);
  const { query, language, index, ...rest } = rule;

  return {
    ...rest,
    name: 'Simple ML Rule',
    description: 'Simple Machine Learning Rule',
    anomaly_threshold: 44,
    machine_learning_job_id: ['some_job_id'],
    type: 'machine_learning',
  };
};

/**
 * Removes all rules by looping over any found and removing them from REST.
 * @param supertest The supertest agent.
 */
export const deleteAllAlerts = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<void> => {
  await countDownTest(
    async () => {
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find?per_page=9999`)
        .set('kbn-xsrf', 'true')
        .send();

      const ids = body.data.map((rule: FullResponseSchema) => ({
        id: rule.id,
      }));

      await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/_bulk_delete`)
        .send(ids)
        .set('kbn-xsrf', 'true');

      const { body: finalCheck } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send();
      return finalCheck.data.length === 0;
    },
    'deleteAllAlerts',
    log,
    50,
    1000
  );
};

export const downgradeImmutableRule = async (
  es: Client,
  log: ToolingLog,
  ruleId: string
): Promise<void> => {
  return countDownES(
    async () => {
      return es.updateByQuery(
        {
          index: '.kibana',
          refresh: true,
          wait_for_completion: true,
          body: {
            script: {
              lang: 'painless',
              source: 'ctx._source.alert.params.version--',
            },
            query: {
              term: {
                'alert.tags': `${INTERNAL_RULE_ID_KEY}:${ruleId}`,
              },
            },
          },
        },
        { meta: true }
      );
    },
    'downgradeImmutableRule',
    log
  );
};

/**
 * Remove all timelines from the .kibana index
 * @param es The ElasticSearch handle
 */
export const deleteAllTimelines = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:siem-ui-timeline',
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

/**
 * Remove all rules execution info saved objects from the .kibana index
 * This will retry 20 times before giving up and hopefully still not interfere with other tests
 * @param es The ElasticSearch handle
 * @param log The tooling logger
 */
export const deleteAllRuleExecutionInfo = async (es: Client, log: ToolingLog): Promise<void> => {
  return countDownES(
    async () => {
      return es.deleteByQuery(
        {
          index: '.kibana',
          q: 'type:siem-detection-engine-rule-execution-info',
          wait_for_completion: true,
          refresh: true,
          body: {},
        },
        { meta: true }
      );
    },
    'deleteAllRuleExecutionInfo',
    log
  );
};

/**
 * Creates the signals index for use inside of beforeEach blocks of tests
 * This will retry 20 times before giving up and hopefully still not interfere with other tests
 * @param supertest The supertest client library
 */
export const createSignalsIndex = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<void> => {
  await countDownTest(
    async () => {
      await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send();
      return true;
    },
    'createSignalsIndex',
    log
  );
};

export const createLegacyRuleAction = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  alertId: string,
  connectorId: string
): Promise<unknown> =>
  supertest
    .post(`${UPDATE_OR_CREATE_LEGACY_ACTIONS}`)
    .set('kbn-xsrf', 'true')
    .query({ alert_id: alertId })
    .send({
      name: 'Legacy notification with one action',
      interval: '1h',
      actions: [
        {
          id: connectorId,
          group: 'default',
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
          actionTypeId: '.slack',
        },
      ],
    });

/**
 * Deletes the signals index for use inside of afterEach blocks of tests
 * @param supertest The supertest client library
 */
export const deleteSignalsIndex = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<void> => {
  await countDownTest(
    async () => {
      await supertest.delete(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send();
      return true;
    },
    'deleteSignalsIndex',
    log
  );
};

/**
 * Given an array of rule_id strings this will return a ndjson buffer which is useful
 * for testing uploads.
 * @param ruleIds Array of strings of rule_ids
 */
export const getSimpleRuleAsNdjson = (ruleIds: string[], enabled = false): Buffer => {
  const stringOfRules = ruleIds.map((ruleId) => {
    const simpleRule = getSimpleRule(ruleId, enabled);
    return JSON.stringify(simpleRule);
  });
  return Buffer.from(stringOfRules.join('\n'));
};

/**
 * Given a rule this will convert it to an ndjson buffer which is useful for
 * testing upload features.
 * @param rule The rule to convert to ndjson
 */
export const ruleToNdjson = (rule: CreateRulesSchema): Buffer => {
  const stringified = JSON.stringify(rule);
  return Buffer.from(`${stringified}\n`);
};

/**
 * This will return a complex rule with all the outputs possible
 * @param ruleId The ruleId to set which is optional and defaults to rule-1
 */
export const getComplexRule = (ruleId = 'rule-1'): Partial<RulesSchema> => ({
  actions: [],
  author: [],
  name: 'Complex Rule Query',
  description: 'Complex Rule Query',
  false_positives: [
    'https://www.example.com/some-article-about-a-false-positive',
    'some text string about why another condition could be a false positive',
  ],
  risk_score: 1,
  risk_score_mapping: [],
  rule_id: ruleId,
  filters: [
    {
      query: {
        match_phrase: {
          'host.name': 'siem-windows',
        },
      },
    },
  ],
  enabled: false,
  index: ['auditbeat-*', 'filebeat-*'],
  interval: '5m',
  output_index: '.siem-signals-default',
  meta: {
    anything_you_want_ui_related_or_otherwise: {
      as_deep_structured_as_you_need: {
        any_data_type: {},
      },
    },
  },
  max_signals: 10,
  tags: ['tag 1', 'tag 2', 'any tag you want'],
  to: 'now',
  from: 'now-6m',
  severity: 'high',
  severity_mapping: [],
  language: 'kuery',
  type: 'query',
  threat: [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: 'TA0040',
        name: 'impact',
        reference: 'https://attack.mitre.org/tactics/TA0040/',
      },
      technique: [
        {
          id: 'T1499',
          name: 'endpoint denial of service',
          reference: 'https://attack.mitre.org/techniques/T1499/',
        },
      ],
    },
    {
      framework: 'Some other Framework you want',
      tactic: {
        id: 'some-other-id',
        name: 'Some other name',
        reference: 'https://example.com',
      },
      technique: [
        {
          id: 'some-other-id',
          name: 'some other technique name',
          reference: 'https://example.com',
        },
      ],
    },
  ],
  references: [
    'http://www.example.com/some-article-about-attack',
    'Some plain text string here explaining why this is a valid thing to look out for',
  ],
  timeline_id: 'timeline_id',
  timeline_title: 'timeline_title',
  note: '# some investigation documentation',
  version: 1,
  query: 'user.name: root or user.name: admin',
});

/**
 * This will return a complex rule with all the outputs possible
 * @param ruleId The ruleId to set which is optional and defaults to rule-1
 */
export const getComplexRuleOutput = (ruleId = 'rule-1'): Partial<RulesSchema> => ({
  actions: [],
  author: [],
  created_by: 'elastic',
  name: 'Complex Rule Query',
  description: 'Complex Rule Query',
  false_positives: [
    'https://www.example.com/some-article-about-a-false-positive',
    'some text string about why another condition could be a false positive',
  ],
  risk_score: 1,
  risk_score_mapping: [],
  rule_id: ruleId,
  filters: [
    {
      query: {
        match_phrase: {
          'host.name': 'siem-windows',
        },
      },
    },
  ],
  enabled: false,
  index: ['auditbeat-*', 'filebeat-*'],
  immutable: false,
  interval: '5m',
  output_index: '.siem-signals-default',
  meta: {
    anything_you_want_ui_related_or_otherwise: {
      as_deep_structured_as_you_need: {
        any_data_type: {},
      },
    },
  },
  max_signals: 10,
  tags: ['tag 1', 'tag 2', 'any tag you want'],
  to: 'now',
  from: 'now-6m',
  severity: 'high',
  severity_mapping: [],
  language: 'kuery',
  type: 'query',
  threat: [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: 'TA0040',
        name: 'impact',
        reference: 'https://attack.mitre.org/tactics/TA0040/',
      },
      technique: [
        {
          id: 'T1499',
          name: 'endpoint denial of service',
          reference: 'https://attack.mitre.org/techniques/T1499/',
        },
      ],
    },
    {
      framework: 'Some other Framework you want',
      tactic: {
        id: 'some-other-id',
        name: 'Some other name',
        reference: 'https://example.com',
      },
      technique: [
        {
          id: 'some-other-id',
          name: 'some other technique name',
          reference: 'https://example.com',
        },
      ],
    },
  ],
  references: [
    'http://www.example.com/some-article-about-attack',
    'Some plain text string here explaining why this is a valid thing to look out for',
  ],
  throttle: 'no_actions',
  timeline_id: 'timeline_id',
  timeline_title: 'timeline_title',
  updated_by: 'elastic',
  note: '# some investigation documentation',
  version: 1,
  query: 'user.name: root or user.name: admin',
  exceptions_list: [],
});

export const getWebHookAction = () => ({
  actionTypeId: '.webhook',
  config: {
    method: 'post',
    url: 'http://localhost',
  },
  secrets: {
    user: 'example',
    password: 'example',
  },
  name: 'Some connector',
});

export const getRuleWithWebHookAction = (
  id: string,
  enabled = false,
  rule?: CreateRulesSchema
): CreateRulesSchema | UpdateRulesSchema => {
  const finalRule = rule != null ? { ...rule, enabled } : getSimpleRule('rule-1', enabled);
  return {
    ...finalRule,
    throttle: 'rule',
    actions: [
      {
        group: 'default',
        id,
        params: {
          body: '{}',
        },
        action_type_id: '.webhook',
      },
    ],
  };
};

export const getSimpleRuleOutputWithWebHookAction = (actionId: string): Partial<RulesSchema> => ({
  ...getSimpleRuleOutput(),
  throttle: 'rule',
  actions: [
    {
      action_type_id: '.webhook',
      group: 'default',
      id: actionId,
      params: {
        body: '{}',
      },
    },
  ],
});

// Similar to ReactJs's waitFor from here: https://testing-library.com/docs/dom-testing-library/api-async#waitfor
export const waitFor = async (
  functionToTest: () => Promise<boolean>,
  functionName: string,
  log: ToolingLog,
  maxTimeout: number = 400000,
  timeoutWait: number = 250
): Promise<void> => {
  let found = false;
  let numberOfTries = 0;
  const maxTries = Math.floor(maxTimeout / timeoutWait);
  while (!found && numberOfTries < maxTries) {
    if (await functionToTest()) {
      found = true;
    } else {
      log.debug(`Try number ${numberOfTries} out of ${maxTries} for function ${functionName}`);
      numberOfTries++;
    }

    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, timeoutWait));
  }

  if (!found) {
    throw new Error(`timed out waiting for function condition to be true within ${functionName}`);
  }
};

/**
 * Does a plain countdown and checks against es queries for either conflicts in the error
 * or for any over the wire issues such as timeouts or temp 404's to make the tests more
 * reliant.
 * @param esFunction The function to test against
 * @param esFunctionName The name of the function to print if we encounter errors
 * @param log The tooling logger
 * @param retryCount The number of times to retry before giving up (has default)
 * @param timeoutWait Time to wait before trying again (has default)
 */
export const countDownES = async (
  esFunction: () => Promise<TransportResult<Record<string, any>, unknown>>,
  esFunctionName: string,
  log: ToolingLog,
  retryCount: number = 20,
  timeoutWait = 250
): Promise<void> => {
  await countDownTest(
    async () => {
      const result = await esFunction();
      if (result.body.version_conflicts !== 0) {
        log.error(`Version conflicts for ${result.body.version_conflicts}`);
        return false;
      } else {
        return true;
      }
    },
    esFunctionName,
    log,
    retryCount,
    timeoutWait
  );
};

/**
 * Refresh an index, making changes available to search.
 * Useful for tests where we want to ensure that a rule does NOT create alerts, e.g. testing exceptions.
 * @param es The ElasticSearch handle
 */
export const refreshIndex = async (es: Client, index?: string) => {
  await es.indices.refresh({
    index,
  });
};

/**
 * Does a plain countdown and checks against a boolean to determine if to wait and try again.
 * This is useful for over the wire things that can cause issues such as conflict or timeouts
 * for testing resiliency.
 * @param functionToTest The function to test against
 * @param name The name of the function to print if we encounter errors
 * @param log The tooling logger
 * @param retryCount The number of times to retry before giving up (has default)
 * @param timeoutWait Time to wait before trying again (has default)
 */
export const countDownTest = async (
  functionToTest: () => Promise<boolean>,
  name: string,
  log: ToolingLog,
  retryCount: number = 20,
  timeoutWait = 250,
  ignoreThrow: boolean = false
) => {
  if (retryCount > 0) {
    try {
      const passed = await functionToTest();
      if (!passed) {
        log.error(`Failure trying to ${name}, retries left are: ${retryCount - 1}`);
        // retry, counting down, and delay a bit before
        await new Promise((resolve) => setTimeout(resolve, timeoutWait));
        await countDownTest(functionToTest, name, log, retryCount - 1, timeoutWait, ignoreThrow);
      }
    } catch (err) {
      if (ignoreThrow) {
        throw err;
      } else {
        log.error(
          `Failure trying to ${name}, with exception message of: ${
            err.message
          }, retries left are: ${retryCount - 1}`
        );
        // retry, counting down, and delay a bit before
        await new Promise((resolve) => setTimeout(resolve, timeoutWait));
        await countDownTest(functionToTest, name, log, retryCount - 1, timeoutWait, ignoreThrow);
      }
    }
  } else {
    log.error(`Could not ${name}, no retries are left`);
  }
};

/**
 * Helper to cut down on the noise in some of the tests. If this detects
 * a conflict it will try to manually remove the rule before re-adding the rule one time and log
 * and error about the race condition.
 * rule a second attempt. It only re-tries adding the rule if it encounters a conflict once.
 * @param supertest The supertest deps
 * @param log The tooling logger
 * @param rule The rule to create
 */
export const createRule = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  rule: CreateRulesSchema
): Promise<FullResponseSchema> => {
  const response = await supertest
    .post(DETECTION_ENGINE_RULES_URL)
    .set('kbn-xsrf', 'true')
    .send(rule);
  if (response.status === 409) {
    if (rule.rule_id != null) {
      log.debug(
        `Did not get an expected 200 "ok" when creating a rule (createRule). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
          response.body
        )}, status: ${JSON.stringify(response.status)}`
      );
      await deleteRule(supertest, log, rule.rule_id);
      const secondResponseTry = await supertest
        .post(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .send(rule);
      if (secondResponseTry.status !== 200) {
        throw new Error(
          `Unexpected non 200 ok when attempting to create a rule (second try): ${JSON.stringify(
            response.body
          )}`
        );
      } else {
        return secondResponseTry.body;
      }
    } else {
      throw new Error('When creating a rule found an unexpected conflict (404)');
    }
  } else if (response.status !== 200) {
    throw new Error(
      `Unexpected non 200 ok when attempting to create a rule: ${JSON.stringify(response.status)}`
    );
  } else {
    return response.body;
  }
};

/**
 * Helper to cut down on the noise in some of the tests. Does a delete of a rule.
 * It does not check for a 200 "ok" on this.
 * @param supertest The supertest deps
 * @param ruleId The rule id to delete
 * @param log The tooling logger
 */
export const deleteRule = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  ruleId: string
): Promise<FullResponseSchema> => {
  const response = await supertest
    .delete(`${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleId}`)
    .set('kbn-xsrf', 'true');
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when deleting the rule (deleteRule). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }

  return response.body;
};

/**
 * Helper to cut down on the noise in some of the tests.
 * @param supertest The supertest deps
 * @param rule The rule to create
 */
export const createRuleWithAuth = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  rule: CreateRulesSchema,
  auth: { user: string; pass: string }
): Promise<FullResponseSchema> => {
  const { body } = await supertest
    .post(DETECTION_ENGINE_RULES_URL)
    .set('kbn-xsrf', 'true')
    .auth(auth.user, auth.pass)
    .send(rule);
  return body;
};

/**
 * Helper to cut down on the noise in some of the tests. This checks for
 * an expected 200 still and does not do any retries.
 * @param supertest The supertest deps
 * @param rule The rule to create
 */
export const updateRule = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  updatedRule: UpdateRulesSchema
): Promise<FullResponseSchema> => {
  const response = await supertest
    .put(DETECTION_ENGINE_RULES_URL)
    .set('kbn-xsrf', 'true')
    .send(updatedRule);
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when updating a rule (updateRule). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};

/**
 * Helper to cut down on the noise in some of the tests. This
 * creates a new action and expects a 200 and does not do any retries.
 * @param supertest The supertest deps
 */
export const createNewAction = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
) => {
  const response = await supertest
    .post('/api/actions/action')
    .set('kbn-xsrf', 'true')
    .send(getWebHookAction());
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when creating a new action. CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};

/**
 * Helper to cut down on the noise in some of the tests. This
 * uses the find API to get an immutable rule by id.
 * @param supertest The supertest deps
 */
export const findImmutableRuleById = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  ruleId: string
): Promise<{
  page: number;
  perPage: number;
  total: number;
  data: FullResponseSchema[];
}> => {
  const response = await supertest
    .get(
      `${DETECTION_ENGINE_RULES_URL}/_find?filter=alert.attributes.tags: "${INTERNAL_IMMUTABLE_KEY}:true" AND alert.attributes.tags: "${INTERNAL_RULE_ID_KEY}:${ruleId}"`
    )
    .set('kbn-xsrf', 'true')
    .send();
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when finding an immutable rule by id (findImmutableRuleById). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};

/**
 * Helper to cut down on the noise in some of the tests. This
 * creates a new action and expects a 200 and does not do any retries.
 * @param supertest The supertest deps
 */
export const getPrePackagedRulesStatus = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<PrePackagedRulesAndTimelinesStatusSchema> => {
  const response = await supertest
    .get(`${DETECTION_ENGINE_PREPACKAGED_URL}/_status`)
    .set('kbn-xsrf', 'true')
    .send();

  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting a pre-packaged rule status. CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};

/**
 * Helper to cut down on the noise in some of the tests. This checks for
 * an expected 200 still and does not try to any retries. Creates exception lists
 * @param supertest The supertest deps
 * @param exceptionList The exception list to create
 * @param log The tooling logger
 */
export const createExceptionList = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  exceptionList: CreateExceptionListSchema
): Promise<ExceptionListSchema> => {
  const response = await supertest
    .post(EXCEPTION_LIST_URL)
    .set('kbn-xsrf', 'true')
    .send(exceptionList);

  if (response.status === 409) {
    if (exceptionList.list_id != null) {
      log.error(
        `When creating an exception list found an unexpected conflict (409) creating an exception list (createExceptionList), will attempt a cleanup and one time re-try. This usually indicates a bad cleanup or race condition within the tests: ${JSON.stringify(
          response.body
        )}, status: ${JSON.stringify(response.status)}`
      );
      await deleteExceptionList(supertest, log, exceptionList.list_id);
      const secondResponseTry = await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(exceptionList);
      if (secondResponseTry.status !== 200) {
        throw new Error(
          `Unexpected non 200 ok when attempting to create an exception list (second try): ${JSON.stringify(
            response.body
          )}`
        );
      } else {
        return secondResponseTry.body;
      }
    } else {
      throw new Error('When creating an exception list found an unexpected conflict (404)');
    }
  } else if (response.status !== 200) {
    throw new Error(
      `Unexpected non 200 ok when attempting to create an exception list: ${JSON.stringify(
        response.status
      )}`
    );
  } else {
    return response.body;
  }
};

/**
 * Helper to cut down on the noise in some of the tests. Does a delete of an exception list.
 * It does not check for a 200 "ok" on this.
 * @param supertest The supertest deps
 * @param listId The exception list to delete
 * @param log The tooling logger
 */
export const deleteExceptionList = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  listId: string
): Promise<FullResponseSchema> => {
  const response = await supertest
    .delete(`${EXCEPTION_LIST_URL}?list_id=${listId}`)
    .set('kbn-xsrf', 'true');
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when deleting an exception list (deleteExceptionList). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }

  return response.body;
};

/**
 * Helper to cut down on the noise in some of the tests. This checks for
 * an expected 200 still and does not try to any retries. Creates exception lists
 * @param supertest The supertest deps
 * @param exceptionListItem The exception list item to create
 * @param log The tooling logger
 */
export const createExceptionListItem = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  exceptionListItem: CreateExceptionListItemSchema
): Promise<ExceptionListItemSchema> => {
  const response = await supertest
    .post(EXCEPTION_LIST_ITEM_URL)
    .set('kbn-xsrf', 'true')
    .send(exceptionListItem);

  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when creating an exception list item (createExceptionListItem). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};

/**
 * Helper to cut down on the noise in some of the tests. This gets
 * a particular rule.
 * @param supertest The supertest deps
 * @param rule The rule to create
 */
export const getRule = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  ruleId: string
): Promise<RulesSchema> => {
  const response = await supertest
    .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleId}`)
    .set('kbn-xsrf', 'true');

  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting a rule (getRule). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};

export const waitForAlertToComplete = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  id: string
): Promise<void> => {
  await waitFor(
    async () => {
      const response = await supertest.get(`/api/alerts/alert/${id}/state`).set('kbn-xsrf', 'true');
      if (response.status !== 200) {
        log.debug(
          `Did not get an expected 200 "ok" when waiting for an alert to complete (waitForAlertToComplete). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
            response.body
          )}, status: ${JSON.stringify(response.status)}`
        );
      }
      return response.body.previousStartedAt != null;
    },
    'waitForAlertToComplete',
    log
  );
};

/**
 * Waits for the rule in find status to be 'succeeded'
 * or the provided status, before continuing
 * @param supertest Deps
 */
export const waitForRuleSuccessOrStatus = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  id: string,
  status: RuleExecutionStatus = RuleExecutionStatus.succeeded,
  afterDate?: Date
): Promise<void> => {
  await waitFor(
    async () => {
      try {
        const response = await supertest
          .get(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .query({ id });
        if (response.status !== 200) {
          log.debug(
            `Did not get an expected 200 "ok" when waiting for a rule success or status (waitForRuleSuccessOrStatus). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
              response.body
            )}, status: ${JSON.stringify(response.status)}`
          );
        }

        // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
        const rule = response.body;
        const ruleStatus = rule?.execution_summary?.last_execution.status;
        const ruleStatusDate = rule?.execution_summary?.last_execution.date;

        if (ruleStatus !== status) {
          log.debug(
            `Did not get an expected status of ${status} while waiting for a rule success or status for rule id ${id} (waitForRuleSuccessOrStatus). Will continue retrying until status is found. body: ${JSON.stringify(
              response.body
            )}, status: ${JSON.stringify(response.status)}`
          );
        }
        return (
          rule != null &&
          ruleStatus === status &&
          (afterDate ? new Date(ruleStatusDate) > afterDate : true)
        );
      } catch (e) {
        if ((e as Error).message.includes('got 503 "Service Unavailable"')) {
          return false;
        }
        throw e;
      }
    },
    'waitForRuleSuccessOrStatus',
    log
  );
};

/**
 * Waits for the signal hits to be greater than the supplied number
 * before continuing with a default of at least one signal
 * @param supertest Deps
 * @param numberOfSignals The number of signals to wait for, default is 1
 */
export const waitForSignalsToBePresent = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  numberOfSignals = 1,
  signalIds: string[]
): Promise<void> => {
  await waitFor(
    async () => {
      const signalsOpen = await getSignalsByIds(supertest, log, signalIds, numberOfSignals);
      return signalsOpen.hits.hits.length >= numberOfSignals;
    },
    'waitForSignalsToBePresent',
    log
  );
};

/**
 * Waits for the event-log execution completed doc count to be greater than the
 * supplied number before continuing with a default of at least one execution
 * @param es The ES client
 * @param log
 * @param ruleId The id of rule to check execution logs for
 * @param totalExecutions The number of executions to wait for, default is 1
 */
export const waitForEventLogExecuteComplete = async (
  es: Client,
  log: ToolingLog,
  ruleId: string,
  totalExecutions = 1
): Promise<void> => {
  await waitFor(
    async () => {
      const executionCount = await getEventLogExecuteCompleteById(es, log, ruleId);
      return executionCount >= totalExecutions;
    },
    'waitForEventLogExecuteComplete',
    log
  );
};

/**
 * Given a single rule id this will return the number of event-log execution
 * completed docs
 * @param es The ES client
 * @param log
 * @param ruleId Rule id
 */
export const getEventLogExecuteCompleteById = async (
  es: Client,
  log: ToolingLog,
  ruleId: string
): Promise<number> => {
  const response = await es.search({
    index: '.kibana-event-log*',
    track_total_hits: true,
    size: 0,
    query: {
      bool: {
        must: [],
        filter: [
          {
            match_phrase: {
              'event.provider': 'alerting',
            },
          },
          {
            match_phrase: {
              'event.action': 'execute',
            },
          },
          {
            match_phrase: {
              'rule.id': ruleId,
            },
          },
        ],
        should: [],
        must_not: [],
      },
    },
  });

  return (response?.hits?.total as SearchTotalHits)?.value ?? 0;
};

/**
 * Indexes provided execution events into .kibana-event-log-*
 * @param es The ElasticSearch handle
 * @param log The tooling logger
 * @param events
 */
export const indexEventLogExecutionEvents = async (
  es: Client,
  log: ToolingLog,
  events: object[]
): Promise<void> => {
  const operations = events.flatMap((doc: object) => [
    { index: { _index: '.kibana-event-log-*' } },
    doc,
  ]);

  await es.bulk({ refresh: true, operations });

  return;
};

/**
 * Remove all .kibana-event-log-* documents with an execution.uuid
 * This will retry 20 times before giving up and hopefully still not interfere with other tests
 * @param es The ElasticSearch handle
 * @param log The tooling logger
 */
export const deleteAllEventLogExecutionEvents = async (
  es: Client,
  log: ToolingLog
): Promise<void> => {
  return countDownES(
    async () => {
      return es.deleteByQuery(
        {
          index: '.kibana-event-log-*',
          q: '_exists_:kibana.alert.rule.execution.uuid',
          wait_for_completion: true,
          refresh: true,
          body: {},
        },
        { meta: true }
      );
    },
    'deleteAllEventLogExecutionEvents',
    log
  );
};

/**
 * Returns all signals both closed and opened by ruleId
 * @param supertest Deps
 */
export const getSignalsByRuleIds = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  ruleIds: string[]
): Promise<estypes.SearchResponse<RACAlert>> => {
  const response = await supertest
    .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
    .set('kbn-xsrf', 'true')
    .send(getQuerySignalsRuleId(ruleIds));

  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting a signal by rule_id (getSignalsByRuleIds). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }

  const { body: signalsOpen }: { body: estypes.SearchResponse<RACAlert> } = response;
  return signalsOpen;
};

/**
 * Given an array of rule ids this will return only signals based on that rule id both
 * open and closed
 * @param supertest agent
 * @param ids Array of the rule ids
 */
export const getSignalsByIds = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  ids: string[],
  size?: number
): Promise<estypes.SearchResponse<RACAlert>> => {
  const response = await supertest
    .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
    .set('kbn-xsrf', 'true')
    .send(getQuerySignalsId(ids, size));

  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting a signal by id. CI issues could happen (getSignalsByIds). Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  const { body: signalsOpen }: { body: estypes.SearchResponse<RACAlert> } = response;
  return signalsOpen;
};

/**
 * Given a single rule id this will return only signals based on that rule id.
 * @param supertest agent
 * @param ids Rule id
 */
export const getSignalsById = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  id: string
): Promise<estypes.SearchResponse<RACAlert>> => {
  const response = await supertest
    .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
    .set('kbn-xsrf', 'true')
    .send(getQuerySignalsId([id]));

  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting signals by id (getSignalsById). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  const { body: signalsOpen }: { body: estypes.SearchResponse<RACAlert> } = response;
  return signalsOpen;
};

export const installPrePackagedRules = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<void> => {
  await countDownTest(
    async () => {
      const { status, body } = await supertest
        .put(DETECTION_ENGINE_PREPACKAGED_URL)
        .set('kbn-xsrf', 'true')
        .send();
      if (status !== 200) {
        log.debug(
          `Did not get an expected 200 "ok" when installing pre-packaged rules (installPrePackagedRules) yet. Retrying until we get a 200 "ok". body: ${JSON.stringify(
            body
          )}, status: ${JSON.stringify(status)}`
        );
      }

      return status === 200;
    },
    'installPrePackagedRules',
    log
  );
};

/**
 * Convenience testing function where you can pass in just the endpoint entries and you will
 * get a container created with the entries.
 * @param supertest super test agent
 * @param endpointEntries The endpoint entries to create the rule and exception list from
 * @param osTypes The os types to optionally add or not to add to the container
 */
export const createContainerWithEndpointEntries = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  endpointEntries: Array<{
    entries: NonEmptyEntriesArray;
    osTypes: OsTypeArray | undefined;
  }>
): Promise<ListArray> => {
  // If not given any endpoint entries, return without any
  if (endpointEntries.length === 0) {
    return [];
  }

  // create the endpoint exception list container
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
    description: 'endpoint description',
    list_id: 'endpoint_list',
    name: 'endpoint_list',
    type: 'endpoint',
  });

  // Add the endpoint exception list container to the backend
  await Promise.all(
    endpointEntries.map((endpointEntry) => {
      const exceptionListItem: CreateExceptionListItemSchema = {
        description: 'endpoint description',
        entries: endpointEntry.entries,
        list_id: 'endpoint_list',
        name: 'endpoint_list',
        os_types: endpointEntry.osTypes,
        type: 'simple',
      };
      return createExceptionListItem(supertest, log, exceptionListItem);
    })
  );

  // To reduce the odds of in-determinism and/or bugs we ensure we have
  // the same length of entries before continuing.
  await waitFor(
    async () => {
      const { body } = await supertest.get(`${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${list_id}`);
      return body.data.length === endpointEntries.length;
    },
    `within createContainerWithEndpointEntries ${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${list_id}`,
    log
  );

  return [
    {
      id,
      list_id,
      namespace_type,
      type,
    },
  ];
};

/**
 * Convenience testing function where you can pass in just the endpoint entries and you will
 * get a container created with the entries.
 * @param supertest super test agent
 * @param entries The entries to create the rule and exception list from
 * @param osTypes The os types to optionally add or not to add to the container
 */
export const createContainerWithEntries = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  entries: NonEmptyEntriesArray[]
): Promise<ListArray> => {
  // If not given any endpoint entries, return without any
  if (entries.length === 0) {
    return [];
  }
  // Create the rule exception list container
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { id, list_id, namespace_type, type } = await createExceptionList(supertest, log, {
    description: 'some description',
    list_id: 'some-list-id',
    name: 'some name',
    type: 'detection',
  });

  // Add the rule exception list container to the backend
  await Promise.all(
    entries.map((entry) => {
      const exceptionListItem: CreateExceptionListItemSchema = {
        description: 'some description',
        list_id: 'some-list-id',
        name: 'some name',
        type: 'simple',
        entries: entry,
      };
      return createExceptionListItem(supertest, log, exceptionListItem);
    })
  );

  // To reduce the odds of in-determinism and/or bugs we ensure we have
  // the same length of entries before continuing.
  await waitFor(
    async () => {
      const { body } = await supertest.get(`${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${list_id}`);
      return body.data.length === entries.length;
    },
    `within createContainerWithEntries ${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${list_id}`,
    log
  );

  return [
    {
      id,
      list_id,
      namespace_type,
      type,
    },
  ];
};

/**
 * Convenience testing function where you can pass in just the entries and you will
 * get a rule created with the entries added to an exception list and exception list item
 * all auto-created at once.
 * @param supertest super test agent
 * @param rule The rule to create and attach an exception list to
 * @param entries The entries to create the rule and exception list from
 * @param endpointEntries The endpoint entries to create the rule and exception list from
 * @param osTypes The os types to optionally add or not to add to the container
 */
export const createRuleWithExceptionEntries = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  rule: CreateRulesSchema,
  entries: NonEmptyEntriesArray[],
  endpointEntries?: Array<{
    entries: NonEmptyEntriesArray;
    osTypes: OsTypeArray | undefined;
  }>
): Promise<FullResponseSchema> => {
  const maybeExceptionList = await createContainerWithEntries(supertest, log, entries);
  const maybeEndpointList = await createContainerWithEndpointEntries(
    supertest,
    log,
    endpointEntries ?? []
  );

  // create the rule but don't run it immediately as running it immediately can cause
  // the rule to sometimes not filter correctly the first time with an exception list
  // or other timing issues. Then afterwards wait for the rule to have succeeded before
  // returning.
  const ruleWithException: CreateRulesSchema = {
    ...rule,
    enabled: false,
    exceptions_list: [...maybeExceptionList, ...maybeEndpointList],
  };
  const ruleResponse = await createRule(supertest, log, ruleWithException);
  const response = await supertest
    .patch(DETECTION_ENGINE_RULES_URL)
    .set('kbn-xsrf', 'true')
    .send({ rule_id: ruleResponse.rule_id, enabled: true });

  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when patching a rule with exception entries (createRuleWithExceptionEntries). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return ruleResponse;
};

export const getIndexNameFromLoad = (loadResponse: Record<string, unknown>): string => {
  const indexNames = Object.keys(loadResponse);
  if (indexNames.length > 1) {
    throw new Error(
      `expected load response to contain one index, but contained multiple: [${indexNames}]`
    );
  }
  return indexNames[0];
};

/**
 * Waits for the given index to contain documents
 *
 * @param esClient elasticsearch {@link Client}
 * @param index name of the index to query
 */
export const waitForIndexToPopulate = async (
  es: Client,
  log: ToolingLog,
  index: string
): Promise<void> => {
  await waitFor(
    async () => {
      const response = await es.count({ index });
      return response.count > 0;
    },
    `waitForIndexToPopulate: ${index}`,
    log
  );
};

export const deleteMigrations = async ({
  ids,
  kbnClient,
}: {
  ids: string[];
  kbnClient: KbnClient;
}): Promise<void> => {
  await Promise.all(
    ids.map((id) =>
      kbnClient.savedObjects.delete({
        id,
        type: signalsMigrationType,
      })
    )
  );
};

interface CreateMigrationResponse {
  index: string;
  migration_index: string;
  migration_id: string;
}

export const startSignalsMigration = async ({
  indices,
  supertest,
  log,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  log: ToolingLog;
  indices: string[];
}): Promise<CreateMigrationResponse[]> => {
  const response = await supertest
    .post(DETECTION_ENGINE_SIGNALS_MIGRATION_URL)
    .set('kbn-xsrf', 'true')
    .send({ index: indices });

  const {
    body: { indices: created },
  }: { body: { indices: CreateMigrationResponse[] } } = response;
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when starting a signals migration (startSignalsMigration). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return created;
};

interface FinalizeMigrationResponse {
  id: string;
  completed?: boolean;
  error?: unknown;
}

export const finalizeSignalsMigration = async ({
  migrationIds,
  supertest,
  log,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  log: ToolingLog;
  migrationIds: string[];
}): Promise<FinalizeMigrationResponse[]> => {
  const response = await supertest
    .post(DETECTION_ENGINE_SIGNALS_FINALIZE_MIGRATION_URL)
    .set('kbn-xsrf', 'true')
    .send({ migration_ids: migrationIds });

  const {
    body: { migrations },
  }: { body: { migrations: FinalizeMigrationResponse[] } } = response;
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when finalizing signals migration (finalizeSignalsMigration). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return migrations;
};

export const getOpenSignals = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  es: Client,
  rule: FullResponseSchema
) => {
  await waitForRuleSuccessOrStatus(supertest, log, rule.id);
  // Critically important that we wait for rule success AND refresh the write index in that order before we
  // assert that no signals were created. Otherwise, signals could be written but not available to query yet
  // when we search, causing tests that check that signals are NOT created to pass when they should fail.
  await refreshIndex(es, '.alerts-security.alerts-default*');
  return getSignalsByIds(supertest, log, [rule.id]);
};

/**
 * Cluster stats URL. Replace this with any from kibana core if there is ever a constant there for this.
 */
export const getStatsUrl = (): string => '/api/telemetry/v2/clusters/_stats';

/**
 * Given a body this will return the detection metrics from it.
 * @param body The Stats body
 * @returns Detection metrics
 */
export const getDetectionMetricsFromBody = (
  body: Array<{
    stats: {
      stack_stats: {
        kibana: { plugins: { security_solution: { detectionMetrics: DetectionMetrics } } };
      };
    };
  }>
): DetectionMetrics => {
  return body[0].stats.stack_stats.kibana.plugins.security_solution.detectionMetrics;
};

/**
 * Gets the stats from the stats endpoint.
 * @param supertest The supertest agent.
 * @returns The detection metrics
 */
export const getStats = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<DetectionMetrics> => {
  const response = await supertest
    .post(getStatsUrl())
    .set('kbn-xsrf', 'true')
    .send({ unencrypted: true, refreshCache: true });
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting the stats for detections. CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return getDetectionMetricsFromBody(response.body);
};

/**
 * Gets the stats from the stats endpoint within specifically the security_solutions application.
 * This is considered the "batch" telemetry.
 * @param supertest The supertest agent.
 * @returns The detection metrics
 */
export const getSecurityTelemetryStats = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<any> => {
  const response = await supertest
    .get(SECURITY_TELEMETRY_URL)
    .set('kbn-xsrf', 'true')
    .send({ unencrypted: true, refreshCache: true });
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when getting the batch stats for security_solutions. CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};

/**
 * This is a typical simple indicator match/threat match for testing that is easy for most basic testing
 * @param ruleId
 * @param enabled Enables the rule on creation or not. Defaulted to false.
 */
export const getSimpleThreatMatch = (
  ruleId = 'rule-1',
  enabled = false
): ThreatMatchCreateSchema => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  severity: 'high',
  enabled,
  index: ['auditbeat-*'],
  type: 'threat_match',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
  from: '1900-01-01T00:00:00.000Z',
  query: '*:*',
  threat_query: '*:*',
  threat_index: ['auditbeat-*'],
  threat_mapping: [
    // We match host.name against host.name
    {
      entries: [
        {
          field: 'host.name',
          value: 'host.name',
          type: 'mapping',
        },
      ],
    },
  ],
  threat_filters: [],
});

interface LegacyActionSO extends LegacyRuleActions {
  references: SavedObjectReference[];
}

/**
 * Fetch all legacy action sidecar SOs from the .kibana index
 * @param es The ElasticSearch service
 */
export const getLegacyActionSO = async (es: Client): Promise<SearchResponse<LegacyActionSO>> =>
  es.search({
    index: '.kibana',
    q: 'type:siem-detection-engine-rule-actions',
  });
