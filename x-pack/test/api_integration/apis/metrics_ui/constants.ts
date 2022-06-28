/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATES = {
  '7.0.0': {
    hosts: {
      min: 1547571261002,
      max: 1547571831033,
    },
  },
  '6.6.0': {
    docker: {
      min: 1547578132289,
      max: 1547579090048,
    },
  },
  '8.0.0': {
    pods_only: {
      min: new Date('2022-01-20T17:09:55.124Z').getTime(),
      max: new Date('2022-01-20T17:14:57.378Z').getTime(),
    },
    hosts_only: {
      min: new Date('2022-01-18T19:57:47.534Z').getTime(),
      max: new Date('2022-01-18T20:02:50.043Z').getTime(),
    },
    logs_and_metrics: {
      min: 1562786660845,
      max: 1562786716965,
    },
    logs_and_metrics_with_aws: {
      min: 1564083185000,
      max: 1564083493080,
    },
  },
  'alert-test-data': {
    gauge: {
      min: 1609459200000, // '2022-01-01T00:00:00Z'
      max: 1609462800000, // '2021-01-01T01:00:00Z',
      midpoint: 1609461000000, // '2021-01-01T00:30:00Z'
    },
    rate: {
      min: 1609545600000, // '2021-01-02T00:00:00Z'
      max: 1609545900000, // '2021-01-02T00:05:00Z'
    },
  },
  ten_thousand_plus: {
    min: 1634604480001, // 2021-10-19T00:48:00.001Z
    max: 1634604839997, // 2021-10-19T00:53:59.997Z
  },
};
