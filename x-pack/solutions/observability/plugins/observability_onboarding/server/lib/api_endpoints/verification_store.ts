/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ApiEndpointId } from '../../../common/api_endpoints';

export type VerificationStatus = 'waiting' | 'accepted' | 'expired';

export interface VerificationSession {
  verificationId: string;
  apiKeyId: string;
  endpointId: ApiEndpointId;
  ingestPath: string;
  targetType?: string;
  targetId?: string;
  detectionActive: boolean;
  status: VerificationStatus;
  createdAt: string;
  expiresAt: string;
  signal?: string;
  receivedAt?: string;
}

export interface RegisterInput {
  verificationId: string;
  apiKeyId: string;
  endpointId: ApiEndpointId;
  ingestPath: string;
  signal?: string;
  targetType?: string;
  targetId?: string;
}

export interface MarkAcceptedInput {
  verificationId: string;
  apiKeyId: string;
  endpointId: string;
  ingestPath: string;
  signal?: string;
  receivedAt?: string;
}

export interface VerificationStore {
  register(input: RegisterInput): VerificationSession;
  setDetectionActive(verificationId: string, active: boolean): void;
  getByVerificationId(verificationId: string): VerificationSession | undefined;
  markAccepted(input: MarkAcceptedInput): 'accepted' | 'no_match';
}

const DEFAULT_TTL_MS = 60 * 60 * 1000;

export const createVerificationId = (): string => `obs-onb-${uuidv4()}`;

export const createVerificationStore = (opts?: {
  now?: () => number;
  ttlMs?: number;
}): VerificationStore => {
  const now = opts?.now ?? (() => Date.now());
  const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
  const sessions = new Map<string, VerificationSession>();

  const isExpired = (session: VerificationSession): boolean =>
    now() >= new Date(session.expiresAt).getTime();

  const removeIfExpired = (verificationId: string): VerificationSession | undefined => {
    const session = sessions.get(verificationId);
    if (!session) {
      return undefined;
    }
    if (isExpired(session)) {
      sessions.delete(verificationId);
      return undefined;
    }
    return session;
  };

  return {
    register(input: RegisterInput): VerificationSession {
      const createdAtMs = now();
      const session: VerificationSession = {
        verificationId: input.verificationId,
        apiKeyId: input.apiKeyId,
        endpointId: input.endpointId,
        ingestPath: input.ingestPath,
        targetType: input.targetType,
        targetId: input.targetId,
        signal: input.signal,
        detectionActive: false,
        status: 'waiting',
        createdAt: new Date(createdAtMs).toISOString(),
        expiresAt: new Date(createdAtMs + ttlMs).toISOString(),
      };
      sessions.set(input.verificationId, session);
      return session;
    },

    setDetectionActive(verificationId: string, active: boolean): void {
      const session = removeIfExpired(verificationId);
      if (session) {
        session.detectionActive = active;
      }
    },

    getByVerificationId(verificationId: string): VerificationSession | undefined {
      return removeIfExpired(verificationId);
    },

    markAccepted(input: MarkAcceptedInput): 'accepted' | 'no_match' {
      const session = removeIfExpired(input.verificationId);
      if (!session) {
        return 'no_match';
      }

      if (
        session.apiKeyId !== input.apiKeyId ||
        session.endpointId !== input.endpointId ||
        session.ingestPath !== input.ingestPath
      ) {
        return 'no_match';
      }

      if (session.status === 'accepted') {
        return 'accepted';
      }

      session.status = 'accepted';
      session.receivedAt = input.receivedAt ?? new Date(now()).toISOString();
      if (input.signal !== undefined) {
        session.signal = input.signal;
      }

      return 'accepted';
    },
  };
};
