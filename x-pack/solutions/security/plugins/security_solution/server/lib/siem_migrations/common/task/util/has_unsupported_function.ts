/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const UNSUPPORTED_FUNCTIONS = [
  'com.q1labs.semsources.cre.tests.SequenceFunction_Test',
  'com.q1labs.semsources.cre.tests.DoubleSequenceFunction_Test',
  'com.q1labs.semsources.cre.tests.CauseAndEffect_Test',
];

export const hasUnsupportedFunctions = (query: string): boolean => {
  return UNSUPPORTED_FUNCTIONS.some((func) => query.includes(func));
};
