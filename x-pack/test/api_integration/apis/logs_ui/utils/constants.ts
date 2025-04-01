/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATES = {
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
