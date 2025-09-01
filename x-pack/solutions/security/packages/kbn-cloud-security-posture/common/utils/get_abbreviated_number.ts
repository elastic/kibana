/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import numeral from '@elastic/numeral';

/**
 * Returns an abbreviated number when the value is greater than or equal to 1000.
 * The abbreviated number is formatted using numeral:
 * - thousand: k
 * - million: m
 * - billion: b
 * - trillion: t
 * */
export const getAbbreviatedNumber = (value: number) => {
  if (isNaN(value)) {
    return 0;
  }
  return value < 1000 ? value : numeral(value).format('0.0a');
};
