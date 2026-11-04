/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The JS errors of one type and stack trace. */
export interface JsErrorGroup {
  type: string;
  /** `null` when the errors have no stack trace. */
  stacktrace: string | null;
  /** The message of the latest error, `null` without one. */
  message: string | null;
  count: number;
  /** ISO time of the latest error, `null` without one. */
  lastSeen: string | null;
}

/** The Errors tab of one EDOT Browser application over the time range and environment. */
export interface ApplicationErrorsResponse {
  serviceName: string;
  /** Grouped by type and stack trace, by count, descending; up to `TOP_ROWS`. */
  errors: JsErrorGroup[];
  /** The environments of the application, whatever the `environment` filter, for the picker. */
  environments: string[];
}
