/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import { v4 as uuidv4 } from 'uuid';
import { SECURITY_SOLUTION_INDEX_PATTERN } from '../../../constants';

/** Name of the detection rule the suite creates, unique per run so alerts from earlier runs never match. */
export const TEST_RULE_NAME = `Test Rule - ${uuidv4()}`;

export const getDiscoverESQLState = (query?: string) => {
  return kbnRison.encode({
    dataSource: { type: 'esql' },
    query: {
      esql: query ?? `FROM ${SECURITY_SOLUTION_INDEX_PATTERN} | WHERE host.name == "siem-kibana"`,
    },
  });
};
