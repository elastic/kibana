/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when a notification type or its connector-specific destination params are invalid. */
export class InvalidNotificationDestinationError extends Error {
  constructor(reason: string) {
    super(`Invalid notification destination: ${reason}`);
    this.name = 'InvalidNotificationDestinationError';
  }
}
