/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MonitorSummaryTLSRule {
  reason: string;
  summary: string;
  status: string;
  configId: string;
  hostName?: string;
  monitorId: string;
  checkedAt: string;
  monitorUrl?: string;
  locationId: string;
  monitorType: string;
  monitorName: string;
  serviceName?: string;
  locationName: string;
  lastErrorMessage?: string;
  lastErrorStack?: string | null;
  stateId?: string | null;
  monitorUrlLabel?: string;
  sha256: string;
  commonName: string;
  issuer: string;
  monitorTags?: string[];
  labels?: Record<string, string>;
}
