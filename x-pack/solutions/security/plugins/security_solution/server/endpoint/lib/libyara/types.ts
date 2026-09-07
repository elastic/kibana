/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { YARA_META_KEYS_OF_INTEREST } from './constants';

export type YaraDiagnosticSeverity = 'error' | 'warning';

export interface YaraDiagnostic {
  severity: YaraDiagnosticSeverity;
  message: string;
  /** 1-based line number from libyara (0 if unknown). */
  line: number;
}

export type YaraMetaKeyOfInterest = (typeof YARA_META_KEYS_OF_INTEREST)[number];

export type YaraCompiledRuleMeta = {
  [key in YaraMetaKeyOfInterest]?: string;
};

export interface YaraCompiledRule {
  /** YARA rule identifier (the token after `rule`). */
  identifier: string;
  meta: YaraCompiledRuleMeta;
  /** Meta keys that appeared more than once. Values are omitted from `meta`. */
  duplicateMeta: YaraMetaKeyOfInterest[];
}

export interface YaraValidateResult {
  /** Errors seen by libyara. Capped at 64. */
  errors: YaraDiagnostic[];
  /** Warnings seen by libyara. Capped at 64. */
  warnings: YaraDiagnostic[];
  /** Total errors seen by libyara. */
  errorCount: number;
  /** Total warnings seen by libyara. */
  warningCount: number;
  /** Rules compiled by libyara. Empty when compile fails or the source has no rules. */
  rules: YaraCompiledRule[];
}
