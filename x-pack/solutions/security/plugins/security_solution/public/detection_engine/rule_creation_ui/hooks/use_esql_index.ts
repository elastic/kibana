/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { getIndexListFromIndexString } from '@kbn/securitysolution-utils';

import type { Query } from '@kbn/es-query';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import { isEsqlRule } from '../../../../common/detection_engine/utils';

/**
 * parses ES|QL query and returns memoized array of indices
 * @param query - ES|QL query to retrieve indices from
 * @param ruleType - rule type value
 * @returns string[] - array of indices. Array is empty if query is invalid or ruleType is not 'esql'.
 */
export const useEsqlIndex = (query: Query['query'], ruleType: Type): string[] => {
  const [debouncedQuery, setDebouncedQuery] = useState<Query['query']>(query);

  useDebounce(
    () => {
      /*
        Triggerring the ES|QL parser a few moments after the user has finished typing 
        to avoid unnecessary calls to the parser.
      */
      setDebouncedQuery(query);
    },
    300,
    [query]
  );

  const indexString = useMemo(() => {
    const esqlQuery =
      typeof debouncedQuery === 'string' && isEsqlRule(ruleType) ? debouncedQuery : undefined;

    try {
      return getIndexPatternFromESQLQuery(esqlQuery);
    } catch (error) {
      /*
        Some invalid queries cause ES|QL parser to throw a TypeError.
        Treating such cases as if parser returned an empty string.
      */
      return '';
    }
  }, [debouncedQuery, ruleType]);

  const index = useMemo(() => getIndexListFromIndexString(indexString), [indexString]);
  return index;
};
