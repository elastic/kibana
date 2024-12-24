/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const metricStatisticsRT = rt.type({
  avg: rt.union([rt.number, rt.null]),
  count: rt.number,
  max: rt.union([rt.number, rt.null]),
  min: rt.union([rt.number, rt.null]),
  sum: rt.number,
});
