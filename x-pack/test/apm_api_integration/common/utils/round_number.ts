/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * To avoid floating precision problems, rounds any number value to max 5 decimals
 * e.g.:
 * element = {value: 0.38770000000000004}
 * return = {value: 0.387700000000000}
 * @param element
 */
export function roundNumber(element: number): any {
  return parseFloat(element.toPrecision(15));
}
