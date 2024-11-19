/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type { NonEmptyEntriesArray, OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import type { RuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';

import {
  createContainerWithEntries,
  createContainerWithEndpointEntries,
} from '../exception_list_and_item';
import { previewRule } from './preview_rule';

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
export const previewRuleWithExceptionEntries = async ({
  supertest,
  log,
  rule,
  entries,
  endpointEntries,
  invocationCount,
  timeframeEnd,
}: {
  supertest: SuperTest.Agent;
  log: ToolingLog;
  rule: RuleCreateProps;
  entries: NonEmptyEntriesArray[];
  endpointEntries?: Array<{
    entries: NonEmptyEntriesArray;
    osTypes: OsTypeArray | undefined;
  }>;
  invocationCount?: number;
  timeframeEnd?: Date;
}) => {
  const maybeExceptionList = await createContainerWithEntries(supertest, log, entries);
  const maybeEndpointList = await createContainerWithEndpointEntries(
    supertest,
    log,
    endpointEntries ?? []
  );

  return previewRule({
    supertest,
    rule: {
      ...rule,
      exceptions_list: [...maybeExceptionList, ...maybeEndpointList],
    },
    invocationCount,
    timeframeEnd,
  });
};
