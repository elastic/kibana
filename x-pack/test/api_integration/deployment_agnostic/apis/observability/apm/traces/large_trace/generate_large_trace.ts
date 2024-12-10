/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-shadow */

import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { apm, timerange, DistributedTrace } from '@kbn/apm-synthtrace-client';

const RATE_PER_MINUTE = 1;

export function generateLargeTrace({
  start,
  end,
  rootTransactionName,
  apmSynthtraceEsClient,
  repeaterFactor,
  environment,
}: {
  start: number;
  end: number;
  rootTransactionName: string;
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  repeaterFactor: number;
  environment: string;
}) {
  const range = timerange(start, end);

  const synthRum = apm
    .service({ name: 'synth-rum', environment, agentName: 'rum-js' })
    .instance('my-instance');

  const synthNode = apm
    .service({ name: 'synth-node', environment, agentName: 'nodejs' })
    .instance('my-instance');

  const synthGo = apm
    .service({ name: 'synth-go', environment, agentName: 'go' })
    .instance('my-instance');

  const synthDotnet = apm
    .service({ name: 'synth-dotnet', environment, agentName: 'dotnet' })
    .instance('my-instance');

  const synthJava = apm
    .service({ name: 'synth-java', environment, agentName: 'java' })
    .instance('my-instance');

  const traces = range.ratePerMinute(RATE_PER_MINUTE).generator((timestamp) => {
    return new DistributedTrace({
      serviceInstance: synthRum,
      transactionName: rootTransactionName,
      timestamp,
      children: (_) => {
        _.service({
          repeat: 5 * repeaterFactor,
          serviceInstance: synthNode,
          transactionName: 'GET /nodejs/products',
          latency: 100,

          children: (_) => {
            _.service({
              serviceInstance: synthGo,
              transactionName: 'GET /go',
              children: (_) => {
                _.service({
                  repeat: 5 * repeaterFactor,
                  serviceInstance: synthJava,
                  transactionName: 'GET /java',
                  children: (_) => {
                    _.external({
                      name: 'GET telemetry.elastic.co',
                      url: 'https://telemetry.elastic.co/ping',
                      duration: 50,
                    });
                  },
                });
              },
            });
            _.db({
              name: 'GET apm-*/_search',
              type: 'elasticsearch',
              duration: 400,
            });
            _.db({ name: 'GET', type: 'redis', duration: 500 });
            _.db({
              name: 'SELECT * FROM users',
              type: 'sqlite',
              duration: 600,
            });
          },
        });

        _.service({
          serviceInstance: synthNode,
          transactionName: 'GET /nodejs/users',
          latency: 100,
          repeat: 5 * repeaterFactor,
          children: (_) => {
            _.service({
              serviceInstance: synthGo,
              transactionName: 'GET /go/security',
              latency: 50,
              children: (_) => {
                _.service({
                  repeat: 5 * repeaterFactor,
                  serviceInstance: synthDotnet,
                  transactionName: 'GET /dotnet/cases/4',
                  latency: 50,
                  children: (_) =>
                    _.db({
                      name: 'GET apm-*/_search',
                      type: 'elasticsearch',
                      duration: 600,
                      statement: JSON.stringify(
                        {
                          query: {
                            query_string: {
                              query: '(new york city) OR (big apple)',
                              default_field: 'content',
                            },
                          },
                        },
                        null,
                        2
                      ),
                    }),
                });
              },
            });
          },
        });
      },
    }).getTransaction();
  });

  return apmSynthtraceEsClient.index(traces);
}
