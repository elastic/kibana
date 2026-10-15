/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Escapes a value for use inside a double-quoted ES|QL string literal. */
const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Builds an ES|QL `WHERE job_id IN (...)` fragment that constrains anomaly
 * records to the security ML jobs (jobs in the `security`/`siem` ML group,
 * whether installed or not), matching the job filtering the anomaly
 * overview/summary APIs apply via `getSecurityMlJobIds` on the server.
 * Returns an empty string when `jobIds` is `undefined` (not yet resolved) or
 * empty, so the query is left unconstrained until the calling hook is ready
 * to run it.
 */
export const getJobIdsFilter = (jobIds: string[] | undefined): string => {
  if (!jobIds || jobIds.length === 0) {
    return '';
  }
  const list = jobIds.map((id) => `"${escapeEsqlString(id)}"`).join(', ');
  return `| WHERE job_id IN (${list}) `;
};
