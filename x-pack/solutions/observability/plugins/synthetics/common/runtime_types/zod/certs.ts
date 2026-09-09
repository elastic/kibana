/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { remoteMonitorInfoSchema } from './remote';

export const GetCertsParamsType = z.looseObject({
  pageIndex: z.number().optional(),
  search: z.string().optional(),
  notValidBefore: z.string().optional(),
  notValidAfter: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sortBy: z.string().optional(),
  direction: z.string().optional(),
  size: z.number().optional(),
  filters: z.unknown().optional(),
  monitorIds: z.array(z.string()).optional(),
  monitorTypes: z.array(z.string()).optional(),
  browserResourceTypes: z.array(z.string()).optional(),
  certOrigin: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  issuers: z.array(z.string()).optional(),
  includeBrowserCerts: z.boolean().optional(),
  remoteNames: z.array(z.string()).optional(),
  showFromAllSpaces: z.boolean().optional(),
});

export const CertMonitorType = z.looseObject({
  name: z.string().optional(),
  id: z.string().optional(),
  configId: z.string().optional(),
  url: z.string().optional(),
  type: z.string().optional(),
  remote: remoteMonitorInfoSchema.optional(),
  spaces: z.array(z.string()).optional(),
});

export const CertType = z.looseObject({
  monitors: z.array(CertMonitorType),
  configId: z.string(),
  monitorName: z.string(),
  monitorId: z.string(),
  monitorType: z.string(),
  locationId: z.string(),
  locationName: z.string(),
  '@timestamp': z.string(),
  not_after: z.string().optional(),
  not_before: z.string().optional(),
  common_name: z.string().optional(),
  issuer: z.string().optional(),
  sha256: z.string().optional(),
  sha1: z.string().optional(),
  monitorUrl: z.string().optional(),
  hostName: z.string().optional(),
  serviceName: z.string().optional(),
  errorMessage: z.string().optional(),
  errorStackTrace: z.union([z.string(), z.null()]).optional(),
  labels: z.record(z.string(), z.string()).optional(),
  tags: z.array(z.string()).optional(),
  monitorTags: z.array(z.string()).optional(),
  remote: remoteMonitorInfoSchema.optional(),
});

export const CertResultType = z.looseObject({
  certs: z.array(CertType),
  total: z.number(),
});

export const CertFacetCountType = z.looseObject({
  value: z.string(),
  count: z.number(),
});

export const CertFacetsType = z.looseObject({
  monitorTypes: z.array(CertFacetCountType),
  tags: z.array(CertFacetCountType),
  issuers: z.array(CertFacetCountType),
  resourceTypes: z.array(CertFacetCountType),
  certOrigin: z.array(CertFacetCountType),
  expiringWithin: z.array(CertFacetCountType),
});
