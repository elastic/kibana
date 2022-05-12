/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { merge } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import { makeTls, TlsProps } from './make_tls';

const DEFAULT_INDEX_NAME = 'heartbeat-8-generated-test';

export const makePing = async (
  es: Client,
  monitorId: string,
  fields: { [key: string]: any },
  mogrify: (doc: any) => any,
  refresh: boolean = true,
  tls: boolean | TlsProps = false,
  customIndex?: string
) => {
  const timestamp = new Date();
  const baseDoc: any = {
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
    '@timestamp': timestamp.toISOString(),
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
      timespan: {
        gte: timestamp.toISOString(),
        lt: new Date(timestamp.getTime() + 5000).toISOString,
      },
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

  if (tls) {
    baseDoc.tls = makeTls(tls as any);
  }

  const doc = mogrify(merge(baseDoc, fields));

  await es.index({
    index: customIndex || DEFAULT_INDEX_NAME,
    refresh,
    body: doc,
  });

  return doc;
};
