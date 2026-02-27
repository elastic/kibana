/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { merge } from 'lodash';
import type { EsClient } from '@kbn/scout-oblt';
import { makePing } from './make_ping';
import type { TlsProps } from './make_tls';

interface CheckProps {
  es: EsClient;
  monitorId?: string;
  numIps?: number;
  fields?: { [key: string]: any };
  mogrify?: (doc: any) => any;
  refresh?: boolean;
  tls?: boolean | TlsProps;
  isFleetManaged?: boolean;
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
  isFleetManaged = false,
}: CheckProps): Promise<{ monitorId: string; docs: any }> => {
  const cgFields = {
    monitor: {
      check_group: uuidv4(),
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
    if (i === numIps - 1) {
      pingFields.summary = summary;
    }
    const doc = await makePing(
      es,
      monitorId,
      pingFields,
      mogrify,
      false,
      tls as any,
      isFleetManaged
    );
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
  es: EsClient,
  monitorId: string,
  numChecks: number = 1,
  numIps: number = 1,
  every: number = 10000, // number of millis between checks
  fields: { [key: string]: any } = {},
  mogrify: (doc: any) => any = (d) => d,
  refresh: boolean = true,
  isFleetManaged: boolean = false
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
      isFleetManaged,
    });
    checks.push(docs);
  }

  if (refresh) {
    await es.indices.refresh();
  }

  return checks;
};

export const makeChecksWithStatus = async (
  es: EsClient,
  monitorId: string,
  numChecks: number,
  numIps: number,
  every: number,
  fields: { [key: string]: any } = {},
  status: 'up' | 'down',
  mogrify: (doc: any) => any = (d) => d,
  refresh: boolean = true,
  isFleetManaged: boolean = false
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
    isFleetManaged
  );
};
