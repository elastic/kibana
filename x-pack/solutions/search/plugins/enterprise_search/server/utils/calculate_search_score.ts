/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const calculateScore = (searchTerm: string = '', valueToTest: string): number => {
  const searchTermLower = searchTerm.toLowerCase();
  const valueToTestLower = valueToTest.toLowerCase();
  if (!searchTermLower) {
    return 80;
  } else if (valueToTestLower === searchTermLower) {
    return 100;
  } else if (valueToTestLower.startsWith(searchTermLower)) {
    return 90;
  } else if (valueToTestLower.includes(searchTermLower)) {
    return 75;
  }
  return 0;
};
