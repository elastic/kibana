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
      max: 1609462800000, // '2021-01-01T01:00:00Z'
    },
    rate: {
      min: 1609545600000, // '2021-01-02T00:00:00Z'
      max: 1609545900000, // '2021-01-02T00:05:00Z'
    },
  },
};
