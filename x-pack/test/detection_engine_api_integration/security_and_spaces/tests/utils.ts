/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OutputRuleAlertRest } from '../../../../legacy/plugins/siem/server/lib/detection_engine/types';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../legacy/plugins/siem/common/constants';

/**
 * This will remove server generated properties such as date times, etc...
 * @param rule Rule to pass in to remove typical server generated properties
 */
export const removeServerGeneratedProperties = (
  rule: Partial<OutputRuleAlertRest>
): Partial<OutputRuleAlertRest> => {
  const {
    created_at,
    updated_at,
    id,
    last_success_at,
    last_success_message,
    status,
    status_date,
    ...removedProperties
  } = rule;
  return removedProperties;
};

/**
 * This will remove server generated properties such as date times, etc... including the rule_id
 * @param rule Rule to pass in to remove typical server generated properties
 */
export const removeServerGeneratedPropertiesIncludingRuleId = (
  rule: Partial<OutputRuleAlertRest>
): Partial<OutputRuleAlertRest> => {
  const ruleWithRemovedProperties = removeServerGeneratedProperties(rule);
  const { rule_id, ...additionalRuledIdRemoved } = ruleWithRemovedProperties;
  return additionalRuledIdRemoved;
};

/**
 * This is a typical simple rule for testing that is easy for most basic testing
 * @param ruleId
 */
export const getSimpleRule = (ruleId = 'rule-1'): Partial<OutputRuleAlertRest> => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  type: 'query',
  query: 'user.name: root or user.name: admin',
});

export const getSignalStatus = () => ({
  aggs: { statuses: { terms: { field: 'signal.status', size: 10 } } },
});

export const setSignalStatus = ({
  signalIds,
  status,
}: {
  signalIds: string[];
  status: 'open' | 'closed';
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
export const getSimpleRuleWithoutRuleId = (): Partial<OutputRuleAlertRest> => {
  const simpleRule = getSimpleRule();
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
 * This is the typical output of a simple rule that Kibana will output with all the defaults.
 */
export const getSimpleRuleOutput = (ruleId = 'rule-1'): Partial<OutputRuleAlertRest> => ({
  created_by: 'elastic',
  description: 'Simple Rule Query',
  enabled: true,
  false_positives: [],
  from: 'now-6m',
  immutable: false,
  interval: '5m',
  rule_id: ruleId,
  language: 'kuery',
  output_index: '.siem-signals-default',
  max_signals: 100,
  risk_score: 1,
  name: 'Simple Rule Query',
  query: 'user.name: root or user.name: admin',
  references: [],
  severity: 'high',
  updated_by: 'elastic',
  tags: [],
  to: 'now',
  type: 'query',
  threat: [],
  version: 1,
});

/**
 * This is the typical output of a simple rule that Kibana will output with all the defaults.
 */
export const getSimpleRuleOutputWithoutRuleId = (
  ruleId = 'rule-1'
): Partial<OutputRuleAlertRest> => {
  const rule = getSimpleRuleOutput(ruleId);
  const { rule_id, ...ruleWithoutRuleId } = rule;
  return ruleWithoutRuleId;
};

/**
 * Remove all alerts from the .kibana index
 * @param es The ElasticSearch handle
 */
export const deleteAllAlerts = async (es: any): Promise<void> => {
  await es.deleteByQuery({
    index: '.kibana',
    q: 'type:alert',
    waitForCompletion: true,
    refresh: 'wait_for',
  });
};

/**
 * Creates the signals index for use inside of beforeEach blocks of tests
 * @param supertest The supertest client library
 */
export const createSignalsIndex = async (supertest: any): Promise<void> => {
  await supertest
    .post(DETECTION_ENGINE_INDEX_URL)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(200);
};

/**
 * Deletes the signals index for use inside of afterEach blocks of tests
 * @param supertest The supertest client library
 */
export const deleteSignalsIndex = async (supertest: any): Promise<void> => {
  await supertest
    .delete(DETECTION_ENGINE_INDEX_URL)
    .set('kbn-xsrf', 'true')
    .send()
    .expect(200);
};

/**
 * Given an array of rule_id strings this will return a ndjson buffer which is useful
 * for testing uploads.
 * @param ruleIds Array of strings of rule_ids
 */
export const getSimpleRuleAsNdjson = (ruleIds: string[]): Buffer => {
  const stringOfRules = ruleIds.map(ruleId => {
    const simpleRule = getSimpleRule(ruleId);
    return JSON.stringify(simpleRule);
  });
  return Buffer.from(stringOfRules.join('\n'));
};

/**
 * Given a rule this will convert it to an ndjson buffer which is useful for
 * testing upload features.
 * @param rule The rule to convert to ndjson
 */
export const ruleToNdjson = (rule: Partial<OutputRuleAlertRest>): Buffer => {
  const stringified = JSON.stringify(rule);
  return Buffer.from(`${stringified}\n`);
};

/**
 * This will return a complex rule with all the outputs possible
 * @param ruleId The ruleId to set which is optional and defaults to rule-1
 */
export const getComplexRule = (ruleId = 'rule-1'): Partial<OutputRuleAlertRest> => ({
  name: 'Complex Rule Query',
  description: 'Complex Rule Query',
  false_positives: [
    'https://www.example.com/some-article-about-a-false-positive',
    'some text string about why another condition could be a false positive',
  ],
  risk_score: 1,
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
  version: 1,
  query: 'user.name: root or user.name: admin',
});

/**
 * This will return a complex rule with all the outputs possible
 * @param ruleId The ruleId to set which is optional and defaults to rule-1
 */
export const getComplexRuleOutput = (ruleId = 'rule-1'): Partial<OutputRuleAlertRest> => ({
  created_by: 'elastic',
  name: 'Complex Rule Query',
  description: 'Complex Rule Query',
  false_positives: [
    'https://www.example.com/some-article-about-a-false-positive',
    'some text string about why another condition could be a false positive',
  ],
  risk_score: 1,
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
  updated_by: 'elastic',
  version: 1,
  query: 'user.name: root or user.name: admin',
});
