/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VulnSeverity } from '@kbn/cloud-security-posture-common';
import { VALID_SEVERITIES } from '@kbn/cloud-security-posture-common';

const isVulnSeverity = (severity: string): severity is VulnSeverity =>
  VALID_SEVERITIES.includes(severity as VulnSeverity);

export const normalizeSeverity = (severity?: string): VulnSeverity =>
  isVulnSeverity(severity?.toUpperCase()) ? severity?.toUpperCase() : 'UNKNOWN';
