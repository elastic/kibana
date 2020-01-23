/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { merge, flattenDeep } from 'lodash';

const INDEX_NAME = 'heartbeat-8.0.0';

export const makePing = async (
  es: any,
  monitorId: string,
  fields: { [key: string]: any },
  mogrify: (doc: any) => any
) => {
  const baseDoc = {
    tcp: {
      rtt: {
        connect: {
          us: 14687,
        },
      },
    },
    observer: {
      geo: {
        name: 'mpls',
        location: '37.926868, -78.024902',
      },
      hostname: 'avc-x1e',
    },
    agent: {
      hostname: 'avc-x1e',
      id: '10730a1a-4cb7-45ce-8524-80c4820476ab',
      type: 'heartbeat',
      ephemeral_id: '0d9a8dc6-f604-49e3-86a0-d8f9d6f2cbad',
      version: '8.0.0',
    },
    '@timestamp': new Date().toISOString(),
    resolve: {
      rtt: {
        us: 350,
      },
      ip: '127.0.0.1',
    },
    ecs: {
      version: '1.1.0',
    },
    host: {
      name: 'avc-x1e',
    },
    http: {
      rtt: {
        response_header: {
          us: 19349,
        },
        total: {
          us: 48954,
        },
        write_request: {
          us: 33,
        },
        content: {
          us: 51,
        },
        validate: {
          us: 19400,
        },
      },
      response: {
        status_code: 200,
        body: {
          bytes: 3,
          hash: '27badc983df1780b60c2b3fa9d3a19a00e46aac798451f0febdca52920faaddf',
        },
      },
    },
    monitor: {
      duration: {
        us: 49347,
      },
      ip: '127.0.0.1',
      id: monitorId,
      check_group: uuid.v4(),
      type: 'http',
      status: 'up',
    },
    event: {
      dataset: 'uptime',
    },
    url: {
      path: '/pattern',
      scheme: 'http',
      port: 5678,
      domain: 'localhost',
      query: 'r=200x5,500x1',
      full: 'http://localhost:5678/pattern?r=200x5,500x1',
    },
  };

  const doc = mogrify(merge(baseDoc, fields));

  await es.index({
    index: INDEX_NAME,
    refresh: true,
    body: doc,
  });

  return doc;
};

export const makeCheck = async (
  es: any,
  monitorId: string,
  numIps: number,
  fields: { [key: string]: any },
  mogrify: (doc: any) => any
) => {
  const cgFields = {
    monitor: {
      check_group: uuid.v4(),
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
    const doc = await makePing(es, monitorId, pingFields, mogrify);
    docs.push(doc);
    // @ts-ignore
    summary[doc.monitor.status]++;
  }
  return docs;
};

export const makeChecks = async (
  es: any,
  monitorId: string,
  numChecks: number,
  numIps: number,
  every: number, // number of millis between checks
  fields: { [key: string]: any } = {},
  mogrify: (doc: any) => any = d => d
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
    checks.push(await makeCheck(es, monitorId, numIps, fields, mogrify));
  }

  return checks;
};

export const makeChecksWithStatus = async (
  es: any,
  monitorId: string,
  numChecks: number,
  numIps: number,
  every: number,
  fields: { [key: string]: any } = {},
  status: 'up' | 'down',
  mogrify: (doc: any) => any = d => d
) => {
  const oppositeStatus = status === 'up' ? 'down' : 'up';

  return await makeChecks(es, monitorId, numChecks, numIps, every, fields, d => {
    d.monitor.status = status;
    if (d.summary) {
      d.summary[status] += d.summary[oppositeStatus];
      d.summary[oppositeStatus] = 0;
    }

    return mogrify(d);
  });
};

// Helper for processing a list of checks to find the time picker bounds.
export const getChecksDateRange = (checks: any[]) => {
  // Flatten 2d arrays
  const flattened = flattenDeep(checks);

  let startTime = 1 / 0;
  let endTime = -1 / 0;
  flattened.forEach(c => {
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
