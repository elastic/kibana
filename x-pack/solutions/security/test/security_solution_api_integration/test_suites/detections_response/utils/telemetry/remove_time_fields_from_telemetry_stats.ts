/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const removeExtraFieldsFromTelemetryStats = (stats: any) => {
  removeExtraFields(stats, [
    'time_executed_in_ms',
    'start_time',
    'end_time',
    'cluster_uuid',
    'cluster_name',
    'license',
  ]);
};

function removeExtraFields(obj: any, fields: string[]): void {
  function traverseAndRemove(o: any): void {
    if (typeof o !== 'object' || o === null) return;

    for (const key in o) {
      if (fields.includes(key)) {
        delete o[key];
      } else if (typeof o[key] === 'object') {
        traverseAndRemove(o[key]);
      }
    }
  }

  traverseAndRemove(obj);
}
