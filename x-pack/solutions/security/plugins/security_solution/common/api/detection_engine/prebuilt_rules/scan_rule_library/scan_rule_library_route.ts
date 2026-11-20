/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleLibraryConnection } from '../rule_library_connection/rule_library_connection';

export type ScanRuleLibraryRequestBody = RuleLibraryConnection;
export const ScanRuleLibraryRequestBody = RuleLibraryConnection;

export interface ScanRuleLibraryManifest {
  name?: string;
  title?: string;
  description?: string;
  version?: string;
  license?: string;
  owner?: { type?: string; github?: string };
}

export type ScanRuleLibraryResponseBody =
  | {
      success: true;
      // The release that was scanned: the pinned one, or the latest.
      version: string;
      rule_count: number;
      manifest?: ScanRuleLibraryManifest;
      // Set instead of a manifest when the file exists but cannot be used.
      manifest_error?: string;
    }
  | { success: false; error: string };
