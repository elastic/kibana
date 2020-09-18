/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { round } from 'lodash';

/**
 * To avoid floating precision problems, rounds any number value to max 5 decimals
 * e.g.:
 * element = {value: 0.38770000000000004}
 * return = {value: 0.3877}
 * @param element
 */
export function roundNumbers(element: any): any {
  if (element === null || element === undefined) {
    return element;
  }

  if (typeof element === 'number') {
    return round(element, 5);
  }

  if (Array.isArray(element)) {
    return element.map(roundNumbers);
  }

  if (typeof element === 'object') {
    const acc: Record<string, unknown> = {};
    Object.keys(element).forEach((key) => {
      acc[key] = roundNumbers(element[key]);
    });

    return acc;
  }

  return element;
}
