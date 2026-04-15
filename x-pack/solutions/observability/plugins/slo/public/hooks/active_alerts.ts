/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';

type SLO = Pick<SLOWithSummaryResponse, 'id' | 'instanceId'>;

const toKey = (slo: SLO): string => {
  const instanceId = slo.instanceId ?? ALL_VALUE;
  if (instanceId === ALL_VALUE) {
    return slo.id;
  }
  return `${slo.id}|${instanceId}`;
};

export class ActiveAlerts {
  private data: Map<string, number>;

  constructor(entries: Array<[SLO, number]> = []) {
    this.data = new Map(entries.map(([slo, count]) => [toKey(slo), count]));
  }

  get(slo: SLO) {
    return this.data.get(toKey(slo));
  }
}
