/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash/fp';

import type { IndexToCheck } from '../../../../types';

export const getIndexToCheck = ({
  indexName,
  pattern,
}: {
  indexName: string;
  pattern: string;
}): IndexToCheck => {
  return {
    pattern,
    indexName,
  };
};

export const getAllIndicesToCheck = (
  patternIndexNames: Record<string, string[]>
): IndexToCheck[] => {
  const allPatterns: string[] = Object.keys(patternIndexNames);

  // sort the patterns A-Z:
  const sortedPatterns = [...allPatterns].sort((a, b) => {
    return a.localeCompare(b);
  });

  // return all `IndexToCheck` sorted first by pattern A-Z:
  return sortedPatterns.reduce<IndexToCheck[]>((acc, pattern) => {
    const indexNames = patternIndexNames[pattern];
    const indicesToCheck = indexNames.map<IndexToCheck>((indexName) =>
      getIndexToCheck({ indexName, pattern })
    );

    const sortedIndicesToCheck = orderBy(['indexName'], ['desc'], indicesToCheck);

    return [...acc, ...sortedIndicesToCheck];
  }, []);
};
