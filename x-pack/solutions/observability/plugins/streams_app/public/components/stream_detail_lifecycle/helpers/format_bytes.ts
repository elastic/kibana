/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] as const;
type SizeUnitTuple = typeof units;
export type SizeUnit = SizeUnitTuple[number];

export const formatBytes = (bytes: number, unit?: SizeUnit) => {
  if (bytes === 0) {
    return { value: 0, unit: unit || 'Bytes' };
  }

  const k = 1024;
  const i = unit ? units.findIndex((u) => u === unit) : Math.floor(Math.log(bytes) / Math.log(k));

  return { value: parseFloat((bytes / Math.pow(k, i)).toFixed(0)), unit: units[i] };
};
