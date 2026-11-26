/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import { v4 as uuidv4 } from 'uuid';
import { SECURITY_SOLUTION_INDEX_PATTERN } from '../../../constants';

let testRuleName = '';

/** Generates a new detection rule name for this suite attempt, so alerts from earlier attempts never match. */
export const createTestRuleName = (): string => {
  testRuleName = `Test Rule - ${uuidv4()}`;
  return testRuleName;
};

/** Returns the name of the detection rule the current suite attempt created. */
export const getTestRuleName = (): string => testRuleName;

export const getDiscoverESQLState = (query?: string) => {
  return kbnRison.encode({
    dataSource: { type: 'esql' },
    query: {
      esql: query ?? `FROM ${SECURITY_SOLUTION_INDEX_PATTERN} | WHERE host.name == "siem-kibana"`,
    },
  });
};
