/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// one second = 1 million micros
const ONE_SECOND_AS_MICROS = 1000000;
const ONE_SECOND_AS_MILLI = 1000;
const ONE_MILLI_AS_MICRO = 1000;

export function milliToSec(ms: number) {
  return ms / ONE_SECOND_AS_MILLI;
}

export function microToSec(micro: number, fixedNumber?: number) {
  if (fixedNumber) {
    return (micro / ONE_SECOND_AS_MICROS).toFixed(fixedNumber);
  }
  return (micro / ONE_SECOND_AS_MICROS).toFixed(0);
}

export function microToMilli(micro: number) {
  return (micro / ONE_MILLI_AS_MICRO).toFixed(0);
}
