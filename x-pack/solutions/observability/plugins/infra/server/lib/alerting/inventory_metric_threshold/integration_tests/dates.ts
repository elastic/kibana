/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATES = {
  '8.0.0': {
    pods_only: {
      min: new Date('2022-01-20T17:09:55.124Z').getTime(),
      max: new Date('2022-01-20T17:14:57.378Z').getTime(),
    },
    hosts_only: {
      min: new Date('2022-01-18T19:57:47.534Z').getTime(),
      max: new Date('2022-01-18T20:02:50.043Z').getTime(),
    },
    rx: {
      max: new Date('2022-06-21T17:02:00.00Z').getTime(),
    },
  },
};
