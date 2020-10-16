/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiResponse, Client } from '@elastic/elasticsearch';
import { SuperTest } from 'supertest';
import supertestAsPromised from 'supertest-as-promised';
import { Context } from '@elastic/elasticsearch/lib/Transport';
import {
  Status,
  SignalIds,
} from '../../plugins/security_solution/common/detection_engine/schemas/common/schemas';
import { CreateRulesSchema } from '../../plugins/security_solution/common/detection_engine/schemas/request/create_rules_schema';
import { UpdateRulesSchema } from '../../plugins/security_solution/common/detection_engine/schemas/request/update_rules_schema';
import { RulesSchema } from '../../plugins/security_solution/common/detection_engine/schemas/response/rules_schema';
import {
  DETECTION_ENGINE_INDEX_URL,
  INTERNAL_RULE_ID_KEY,
} from '../../plugins/security_solution/common/constants';

/**
 * This will remove server generated properties such as date times, etc...
 * @param rule Rule to pass in to remove typical server generated properties
 */
export const removeServerGeneratedProperties = (
  rule: Partial<RulesSchema>
): Partial<RulesSchema> => {
  const {
    /* eslint-disable @typescript-eslint/naming-convention */
    created_at,
    updated_at,
    id,
    last_failure_at,
    last_failure_message,
    last_success_at,
    last_success_message,
    status,
    status_date,
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
  rule: Partial<RulesSchema>
): Partial<RulesSchema> => {
  const ruleWithRemovedProperties = removeServerGeneratedProperties(rule);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { rule_id, ...additionalRuledIdRemoved } = ruleWithRemovedProperties;
  return additionalRuledIdRemoved;
};

/**
 * This is a typical simple rule for testing that is easy for most basic testing
 * @param ruleId
 * @param enabled Enables the rule on creation or not. Defaulted to false to enable it on import
 */
export const getSimpleRule = (ruleId = 'rule-1', enabled = true): CreateRulesSchema => ({
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
 * This is a typical simple rule for testing that is easy for most basic testing
 * @param ruleId
 */
export const getSimpleRuleUpdate = (ruleId = 'rule-1'): UpdateRulesSchema => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index: ['auditbeat-*'],
  type: 'query',
  query: 'user.name: root or user.name: admin',
});

/**
 * This is a representative ML rule payload as expected by the server
 * @param ruleId
 */
export const getSimpleMlRule = (ruleId = 'rule-1'): CreateRulesSchema => ({
  name: 'Simple ML Rule',
  description: 'Simple Machine Learning Rule',
  anomaly_threshold: 44,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  machine_learning_job_id: 'some_job_id',
  type: 'machine_learning',
});

export const getSimpleMlRuleUpdate = (ruleId = 'rule-1'): UpdateRulesSchema => ({
  name: 'Simple ML Rule',
  description: 'Simple Machine Learning Rule',
  anomaly_threshold: 44,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  machine_learning_job_id: 'some_job_id',
  type: 'machine_learning',
});

export const getSignalStatus = () => ({
  aggs: { statuses: { terms: { field: 'signal.status', size: 10 } } },
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
export const getSimpleRuleOutput = (ruleId = 'rule-1'): Partial<RulesSchema> => ({
  actions: [],
  author: [],
  created_by: 'elastic',
  description: 'Simple Rule Query',
  enabled: true,
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
 * This is the typical output of a simple rule that Kibana will output with all the defaults except
 * for all the server generated properties such as created_by. Useful for testing end to end tests.
 */
export const getSimpleRuleOutputWithoutRuleId = (ruleId = 'rule-1'): Partial<RulesSchema> => {
  const rule = getSimpleRuleOutput(ruleId);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { rule_id, ...ruleWithoutRuleId } = rule;
  return ruleWithoutRuleId;
};

export const getSimpleMlRuleOutput = (ruleId = 'rule-1'): Partial<RulesSchema> => {
  const rule = getSimpleRuleOutput(ruleId);
  const { query, language, index, ...rest } = rule;

  return {
    ...rest,
    name: 'Simple ML Rule',
    description: 'Simple Machine Learning Rule',
    anomaly_threshold: 44,
    machine_learning_job_id: 'some_job_id',
    type: 'machine_learning',
  };
};

/**
 * Remove all alerts from the .kibana index
 * This will retry 20 times before giving up and hopefully still not interfere with other tests
 * @param es The ElasticSearch handle
 */
export const deleteAllAlerts = async (es: Client): Promise<void> => {
  return countDownES(async () => {
    return es.deleteByQuery({
      index: '.kibana',
      q: 'type:alert',
      wait_for_completion: true,
      refresh: true,
      conflicts: 'proceed',
      body: {},
    });
  }, 'deleteAllAlerts');
};

export const downgradeImmutableRule = async (es: Client, ruleId: string): Promise<void> => {
  return countDownES(async () => {
    return es.updateByQuery({
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
    });
  }, 'downgradeImmutableRule');
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
 * Remove all rules statuses from the .kibana index
 * This will retry 20 times before giving up and hopefully still not interfere with other tests
 * @param es The ElasticSearch handle
 */
export const deleteAllRulesStatuses = async (es: Client, retryCount = 20): Promise<void> => {
  return countDownES(async () => {
    return es.deleteByQuery({
      index: '.kibana',
      q: 'type:siem-detection-engine-rule-status',
      wait_for_completion: true,
      refresh: true,
      body: {},
    });
  }, 'deleteAllRulesStatuses');
};

/**
 * Creates the signals index for use inside of beforeEach blocks of tests
 * This will retry 20 times before giving up and hopefully still not interfere with other tests
 * @param supertest The supertest client library
 */
export const createSignalsIndex = async (
  supertest: SuperTest<supertestAsPromised.Test>
): Promise<void> => {
  await countDownTest(async () => {
    await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send();
    return true;
  }, 'createSignalsIndex');
};

/**
 * Deletes the signals index for use inside of afterEach blocks of tests
 * @param supertest The supertest client library
 */
export const deleteSignalsIndex = async (
  supertest: SuperTest<supertestAsPromised.Test>
): Promise<void> => {
  await countDownTest(async () => {
    await supertest.delete(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send();
    return true;
  }, 'deleteSignalsIndex');
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
export const ruleToNdjson = (rule: Partial<CreateRulesSchema>): Buffer => {
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

export const getRuleWithWebHookAction = (id: string): CreateRulesSchema => ({
  ...getSimpleRule(),
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
});

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
  maxTimeout: number = 5000,
  timeoutWait: number = 10
): Promise<void> => {
  await new Promise(async (resolve, reject) => {
    let found = false;
    let numberOfTries = 0;
    while (!found && numberOfTries < Math.floor(maxTimeout / timeoutWait)) {
      const itPasses = await functionToTest();
      if (itPasses) {
        found = true;
      } else {
        numberOfTries++;
      }
      await new Promise((resolveTimeout) => setTimeout(resolveTimeout, timeoutWait));
    }
    if (found) {
      resolve();
    } else {
      reject(new Error('timed out waiting for function condition to be true'));
    }
  });
};

/**
 * Does a plain countdown and checks against es queries for either conflicts in the error
 * or for any over the wire issues such as timeouts or temp 404's to make the tests more
 * reliant.
 * @param esFunction The function to test against
 * @param esFunctionName The name of the function to print if we encounter errors
 * @param retryCount The number of times to retry before giving up (has default)
 * @param timeoutWait Time to wait before trying again (has default)
 */
export const countDownES = async (
  esFunction: () => Promise<ApiResponse<Record<string, any>, Context>>,
  esFunctionName: string,
  retryCount: number = 20,
  timeoutWait = 250
): Promise<void> => {
  await countDownTest(
    async () => {
      const result = await esFunction();
      if (result.body.version_conflicts !== 0) {
        // eslint-disable-next-line no-console
        console.log(`Version conflicts for ${result.body.version_conflicts}`);
        return false;
      } else {
        return true;
      }
    },
    esFunctionName,
    retryCount,
    timeoutWait
  );
};

/**
 * Does a plain countdown and checks against a boolean to determine if to wait and try again.
 * This is useful for over the wire things that can cause issues such as conflict or timeouts
 * for testing resiliency.
 * @param functionToTest The function to test against
 * @param name The name of the function to print if we encounter errors
 * @param retryCount The number of times to retry before giving up (has default)
 * @param timeoutWait Time to wait before trying again (has default)
 */
export const countDownTest = async (
  functionToTest: () => Promise<boolean>,
  name: string,
  retryCount: number = 20,
  timeoutWait = 250,
  ignoreThrow: boolean = false
) => {
  if (retryCount > 0) {
    try {
      const passed = await functionToTest();
      if (!passed) {
        // eslint-disable-next-line no-console
        console.log(`Failure trying to ${name}, retries left are: ${retryCount - 1}`);
        // retry, counting down, and delay a bit before
        await new Promise((resolve) => setTimeout(resolve, timeoutWait));
        await countDownTest(functionToTest, name, retryCount - 1, timeoutWait, ignoreThrow);
      }
    } catch (err) {
      if (ignoreThrow) {
        throw err;
      } else {
        // eslint-disable-next-line no-console
        console.log(
          `Failure trying to ${name}, with exception message of:`,
          err.message,
          `retries left are: ${retryCount - 1}`
        );
        // retry, counting down, and delay a bit before
        await new Promise((resolve) => setTimeout(resolve, timeoutWait));
        await countDownTest(functionToTest, name, retryCount - 1, timeoutWait, ignoreThrow);
      }
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(`Could not ${name}, no retries are left`);
  }
};
