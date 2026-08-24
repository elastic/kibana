/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type YaraDiagnosticSeverity = 'error' | 'warning';

export interface YaraDiagnostic {
  severity: YaraDiagnosticSeverity;
  message: string;
  /** 1-based line number from libyara (0 if unknown). */
  line: number;
}

export interface YaraValidateResult {
  errors: YaraDiagnostic[];
  warnings: YaraDiagnostic[];
}
