/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

const DEFAULT_TIMEOUT_MS = 4000;

export interface CollectorWatchBody {
  targetType: string;
  targetId: string;
  apiKeyId: string;
  verificationId: string;
  expiresAt: string;
}

export interface RegisterCollectorWatchInput {
  collectorWatchUrl: string;
  token: string;
  body: CollectorWatchBody;
  timeoutMs?: number;
  logger: Logger;
}

export const registerCollectorWatch = async ({
  collectorWatchUrl,
  token,
  body,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  logger,
}: RegisterCollectorWatchInput): Promise<boolean> => {
  const url = `${collectorWatchUrl.replace(/\/+$/, '')}/internal/onboarding_receipt/watch`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok;
  } catch (error) {
    logger.warn(
      `Onboarding collector watch registration failed for verificationId ${body.verificationId}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
    return false;
  }
};
