/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { merge, flattenDeep } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import { makePing } from './make_ping';
import { TlsProps } from './make_tls';

interface CheckProps {
  es: Client;
  monitorId?: string;
  numIps?: number;
  fields?: { [key: string]: any };
  mogrify?: (doc: any) => any;
  refresh?: boolean;
  tls?: boolean | TlsProps;
  customIndex?: string;
}

const getRandomMonitorId = () => {
  return 'monitor-' + Math.random().toString(36).substring(7);
};
export const makeCheck = async ({
  es,
  monitorId = getRandomMonitorId(),
  numIps = 1,
  fields = {},
  mogrify = (d) => d,
  refresh = true,
  tls = false,
  customIndex,
}: CheckProps): Promise<{ monitorId: string; docs: any }> => {
  const cgFields = {
    monitor: {
      check_group: fields.monitor?.check_group || uuid.v4(),
    },
  };

  const docs = [];
  const summary = {
    up: 0,
    down: 0,
  };
  for (let i = 0; i < numIps; i++) {
    const pingFields = merge(fields, cgFields, {
      monitor: {
        ip: `127.0.0.${i}`,
      },
    });
    if (i === numIps - 1 && fields.summary !== null) {
      pingFields.summary = summary;
    }
    const doc = await makePing(es, monitorId, pingFields, mogrify, false, tls as any, customIndex);
    docs.push(doc);
    // @ts-ignore
    summary[doc.monitor.status]++;
  }

  if (refresh) {
    await es.indices.refresh();
  }

  return { monitorId, docs };
};

export const makeChecks = async (
  es: Client,
  monitorId: string,
  numChecks: number = 1,
  numIps: number = 1,
  every: number = 10000, // number of millis between checks
  fields: { [key: string]: any } = {},
  mogrify: (doc: any) => any = (d) => d,
  refresh: boolean = true,
  customIndex?: string
) => {
  const checks = [];
  const oldestTime = new Date().getTime() - numChecks * every;
  let newestTime = oldestTime;
  for (let li = 0; li < numChecks; li++) {
    const checkDate = new Date(newestTime + every);
    newestTime = checkDate.getTime() + every;
    fields = merge(fields, {
      '@timestamp': checkDate.toISOString(),
      monitor: {
        timespan: {
          gte: checkDate.toISOString(),
          lt: new Date(newestTime).toISOString(),
        },
      },
    });
    const { docs } = await makeCheck({
      es,
      monitorId,
      numIps,
      fields,
      mogrify,
      refresh: false,
      customIndex,
    });
    checks.push(docs);
  }

  if (refresh) {
    await es.indices.refresh();
  }

  return checks;
};

export const makeChecksWithStatus = async (
  es: Client,
  monitorId: string,
  numChecks: number,
  numIps: number,
  every: number,
  fields: { [key: string]: any } = {},
  status: 'up' | 'down',
  mogrify: (doc: any) => any = (d) => d,
  refresh: boolean = true,
  customIndex?: string
) => {
  const oppositeStatus = status === 'up' ? 'down' : 'up';

  return await makeChecks(
    es,
    monitorId,
    numChecks,
    numIps,
    every,
    fields,
    (d) => {
      d.monitor.status = status;
      if (d.summary) {
        d.summary[status] += d.summary[oppositeStatus];
        d.summary[oppositeStatus] = 0;
      }

      return mogrify(d);
    },
    refresh,
    customIndex
  );
};

// Helper for processing a list of checks to find the time picker bounds.
export const getChecksDateRange = (checks: any[]) => {
  // Flatten 2d arrays
  const flattened = flattenDeep(checks);

  let startTime = 1 / 0;
  let endTime = -1 / 0;
  flattened.forEach((c) => {
    const ts = Date.parse(c['@timestamp']);

    if (ts < startTime) {
      startTime = ts;
    }

    if (ts > endTime) {
      endTime = ts;
    }
  });

  return {
    start: new Date(startTime).toISOString(),
    end: new Date(endTime).toISOString(),
  };
};
