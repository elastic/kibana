/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function createLogDoc({
  time,
  logFilepath,
  serviceName,
  namespace,
  datasetName,
  message,
}: {
  time: number;
  logFilepath: string;
  serviceName?: string;
  namespace: string;
  datasetName: string;
  message: string;
}) {
  return {
    input: {
      type: 'log',
    },
    '@timestamp': new Date(time).toISOString(),
    log: {
      file: {
        path: logFilepath,
      },
    },
    ...(serviceName
      ? {
          service: {
            name: serviceName,
          },
        }
      : {}),
    data_stream: {
      namespace,
      type: 'logs',
      dataset: datasetName,
    },
    message,
    event: {
      dataset: datasetName,
    },
  };
}
