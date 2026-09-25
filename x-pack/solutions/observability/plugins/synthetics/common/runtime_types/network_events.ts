/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from './schema_output';
import type {
  NetworkTimingsType,
  CertificateDataType,
  NetworkEventType,
} from './zod/network_events';
import { SyntheticsNetworkEventsApiResponseType } from './zod/network_events';

export { SyntheticsNetworkEventsApiResponseType };

export type NetworkTimings = SchemaOutput<typeof NetworkTimingsType>;
export type CertificateData = SchemaOutput<typeof CertificateDataType>;
export type NetworkEvent = SchemaOutput<typeof NetworkEventType>;
export type SyntheticsNetworkEventsApiResponse = SchemaOutput<
  typeof SyntheticsNetworkEventsApiResponseType
>;
