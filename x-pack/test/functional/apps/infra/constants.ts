/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATES = {
  '7.0.0': {
    hosts: {
      min: '01/15/2019 04:54:21 PM',
      max: '01/15/2019 05:03:51 PM',
    },
  },
  '6.6.0': {
    docker: {
      min: '01/15/2019 06:48:52 PM',
      max: '01/15/2019 07:04:50 PM',
    },
  },
  metricsAndLogs: {
    hosts: {
      withData: '10/17/2018 7:58:03 PM',
      withoutData: '10/09/2018 10:00:00 PM',
    },
    stream: {
      startWithData: '2018-10-17T19:42:22.000Z',
      endWithData: '2018-10-17T19:57:21.000Z',
    },
  },
};
