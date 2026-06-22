/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a Microsoft Sentinel Scheduled Analytics Rule as parsed from
 * an ARM template JSON export.
 */
export interface SentinelRule {
  /** The rule's unique identifier (ARM resource name or GUID) */
  id: string;
  /** The rule display name */
  displayName: string;
  /** The rule description */
  description: string;
  /** The KQL query for the rule */
  query: string;
  /** The severity of the rule */
  severity: string;
  /** MITRE ATT&CK tactic IDs, e.g. ["Persistence", "InitialAccess"] */
  tactics?: string[];
  /** MITRE ATT&CK technique IDs, e.g. ["T1078", "T1566"] */
  techniques?: string[];
}
