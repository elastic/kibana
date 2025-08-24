/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from '@kbn/datemath';
import dateMath from '@kbn/datemath';

const ES_INTERVAL_STRING_REGEX = new RegExp(`^([1-9][0-9]*)s*(${dateMath.units.join('|')})$`);

export function parseEsInterval(interval: string): number {
  const matches = String(interval).trim().match(ES_INTERVAL_STRING_REGEX);

  if (!matches) {
    throw new Error(`Invalid interval format: ${interval}`);
  }

  const value = parseFloat(matches[1]);
  const unit = matches[2] as Unit;

  const unitInfo = dateMath.unitsMap[unit];
  if (!unitInfo || !unitInfo.base) {
    throw new Error(`Invalid interval unit: ${unit}`);
  }

  return unitInfo.base * value;
}
