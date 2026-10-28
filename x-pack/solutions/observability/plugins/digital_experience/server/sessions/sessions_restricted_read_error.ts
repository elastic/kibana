/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown before any setup write when the enabling user's read on the source indices is filtered
 * by document- or field-level security, or can't be checked. The transforms summarize everything
 * the enabling user can read, for every reader, so a filtered read would silently drop other
 * applications' sessions or fields for everyone.
 */
export class SessionsRestrictedReadError extends Error {
  constructor(
    public readonly restrictedIndices: string[],
    public readonly reason: 'filtered' | 'unverifiable'
  ) {
    super(
      reason === 'filtered'
        ? `Enabling sessions requires read on ${restrictedIndices.join(
            ', '
          )} without document- or field-level security, as the sessions transforms summarize what the enabling user can read for everyone who reads sessions.`
        : `Elasticsearch can't report the index privileges of an API key with its own role descriptors, so enabling sessions can't confirm unrestricted read on ${restrictedIndices.join(
            ', '
          )}. Enable sessions as a user, or with an API key without role descriptors.`
    );
    this.name = 'SessionsRestrictedReadError';
  }
}
