/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from './schema_output';
import type {
  GetCertsParamsType,
  CertMonitorType,
  CertType,
  CertResultType,
  CertFacetCountType,
  CertFacetsType,
} from './schemas/certs';

export type GetCertsParams = SchemaOutput<typeof GetCertsParamsType>;
export type CertFacetCount = SchemaOutput<typeof CertFacetCountType>;
export type CertFacets = SchemaOutput<typeof CertFacetsType>;
export type Cert = SchemaOutput<typeof CertType>;
export type CertMonitor = SchemaOutput<typeof CertMonitorType>;
export type CertResult = SchemaOutput<typeof CertResultType>;
