/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import { StoredInvestigation } from '../../models/investigation';
import { SO_INVESTIGATION_TYPE } from '../../saved_objects/investigation';
import { computeMetrics } from './helpers/metrics';
import { Usage } from './type';

export const fetcher = async (context: CollectorFetchContext) => {
  const finder = context.soClient.createPointInTimeFinder<StoredInvestigation>({
    type: SO_INVESTIGATION_TYPE,
    perPage: 10,
  });

  let usage: Usage['investigation'] = {
    total: 0,
    by_status: {
      triage: 0,
      active: 0,
      mitigated: 0,
      resolved: 0,
      cancelled: 0,
    },
    by_origin: {
      alert: 0,
      blank: 0,
    },
    items: {
      avg: 0,
      p90: 0,
      p95: 0,
      max: 0,
      min: 0,
    },
    notes: {
      avg: 0,
      p90: 0,
      p95: 0,
      max: 0,
      min: 0,
    },
  };

  const items: number[] = [];
  const notes: number[] = [];

  for await (const response of finder.find()) {
    usage = response.saved_objects.reduce((acc, so) => {
      items.push(so.attributes.items.length);
      notes.push(so.attributes.notes.length);

      return {
        ...acc,
        total: acc.total + 1,
        by_status: {
          ...acc.by_status,
          ...(so.attributes.status === 'triage' && { triage: acc.by_status.triage + 1 }),
          ...(so.attributes.status === 'active' && { active: acc.by_status.active + 1 }),
          ...(so.attributes.status === 'mitigated' && { mitigated: acc.by_status.mitigated + 1 }),
          ...(so.attributes.status === 'resolved' && { resolved: acc.by_status.resolved + 1 }),
          ...(so.attributes.status === 'cancelled' && { cancelled: acc.by_status.cancelled + 1 }),
        },
        by_origin: {
          ...acc.by_origin,
          ...(so.attributes.origin.type === 'alert' && { alert: acc.by_origin.alert + 1 }),
          ...(so.attributes.origin.type === 'blank' && { blank: acc.by_origin.blank + 1 }),
        },
      };
    }, usage);
  }

  usage.items = computeMetrics(items.sort());
  usage.notes = computeMetrics(notes.sort());

  await finder.close();

  return {
    investigation: usage,
  };
};
