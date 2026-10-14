/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from '../errors/status_error';

/**
 * Thrown when the Slack App surface is not configured/available on this deployment.
 * Extends the shared `StatusError` so `createServerRoute` maps it to a 400 response
 * automatically, the same way every other Significant Events route error is handled.
 */
export class SlackAppUnavailableError extends StatusError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'SlackAppUnavailableError';
  }
}
