/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type { NonEmptyEntriesArray, OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import type {
  RuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { createContainerWithEntries } from './create_container_with_entries';
import { createContainerWithEndpointEntries } from './create_container_with_endpoint_entries';
import { createRule } from './create_rule';

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
  rule: RuleCreateProps,
  entries: NonEmptyEntriesArray[],
  endpointEntries?: Array<{
    entries: NonEmptyEntriesArray;
    osTypes: OsTypeArray | undefined;
  }>
): Promise<RuleResponse> => {
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
  const ruleWithException: RuleCreateProps = {
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
