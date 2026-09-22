/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const NetworkTimingsType = z.looseObject({
  queueing: z.number(),
  connect: z.number(),
  total: z.number(),
  send: z.number(),
  blocked: z.number(),
  receive: z.number(),
  wait: z.number(),
  dns: z.number(),
  proxy: z.number(),
  ssl: z.number(),
});

const CertificateDataType = z.looseObject({
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  issuer: z.string().optional(),
  subjectName: z.string().optional(),
});

const NetworkEventType = z.looseObject({
  timestamp: z.string(),
  requestSentTime: z.number(),
  loadEndTime: z.number(),
  url: z.string(),
  certificates: CertificateDataType.optional(),
  ip: z.string().optional(),
  method: z.string().optional(),
  status: z.number().optional(),
  mimeType: z.string().optional(),
  responseHeaders: z.record(z.string(), z.string()).optional(),
  requestHeaders: z.record(z.string(), z.string()).optional(),
  timings: NetworkTimingsType.optional(),
  transferSize: z.number().optional(),
  resourceSize: z.number().optional(),
});

export const SyntheticsNetworkEventsApiResponseType = z.looseObject({
  events: z.array(NetworkEventType),
  total: z.number(),
  isWaterfallSupported: z.boolean(),
  hasNavigationRequest: z.boolean(),
});
