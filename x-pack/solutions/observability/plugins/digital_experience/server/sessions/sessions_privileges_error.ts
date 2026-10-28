/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown before any setup write when the enabling user lacks a required privilege. */
export class SessionsPrivilegesError extends Error {
  constructor(public readonly missingPrivileges: string[]) {
    super(
      `Enabling sessions requires these Elasticsearch privileges: ${missingPrivileges.join(', ')}`
    );
    this.name = 'SessionsPrivilegesError';
  }
}
