/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthStatus } from '@elastic/elasticsearch/lib/api/types';

import type { IconColor } from '@elastic/eui';

// see https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html for the current rules

export function isValidIndexName(name: string) {
  const byteLength = encodeURI(name).split(/%(?:u[0-9A-F]{2})?[0-9A-F]{2}|./).length - 1;
  const reg = new RegExp('[\\\\/:*?"<>|\\s,#]+');
  const indexPatternInvalid =
    byteLength > 255 || // name can't be greater than 255 bytes
    name !== name.toLowerCase() || // name should be lowercase
    name.match(/^[-_+.]/) !== null || // name can't start with these chars
    name.match(reg) !== null; // name can't contain these chars

  return !indexPatternInvalid;
}

export function generateRandomIndexName(
  prefix: string = 'search-',
  randomSuffixLength: number = 4
) {
  const suffixCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charsLength = suffixCharacters.length;
  let result = prefix;

  let counter = 0;
  do {
    result += suffixCharacters.charAt(Math.random() * charsLength);
    counter++;
  } while (counter < randomSuffixLength);

  return result;
}

export function getFirstNewIndexName(startingIndexNames: string[], currentIndexNames: string[]) {
  for (const index of currentIndexNames) {
    if (startingIndexNames.indexOf(index) === -1) {
      return index;
    }
  }
  return undefined;
}

export type HealthStatusStrings = 'red' | 'green' | 'yellow' | 'unavailable';
export const healthColorsMap: Record<HealthStatusStrings, IconColor> = {
  red: 'danger',
  green: 'success',
  yellow: 'warning',
  unavailable: '',
};

export const normalizeHealth = (health: HealthStatusStrings | HealthStatus): HealthStatusStrings =>
  health.toLowerCase() as HealthStatusStrings;
export const indexHealthToHealthColor = (
  health: HealthStatus | 'unavailable' = 'unavailable'
): IconColor => {
  return healthColorsMap[normalizeHealth(health)] ?? healthColorsMap.unavailable;
};
