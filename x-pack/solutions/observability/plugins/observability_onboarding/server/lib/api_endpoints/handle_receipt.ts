/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VerificationStore } from './verification_store';

export interface ReceiptBody {
  verificationId: string;
  apiKeyId: string;
  endpointId: string;
  ingestPath: string;
  status: 'accepted';
  signal?: string;
  receivedAt?: string;
}

export interface HandleReceiptInput {
  store: VerificationStore;
  collectorToKibanaToken?: string;
  authorizationHeader?: string;
  body: ReceiptBody;
}

export type HandleReceiptResult = { statusCode: 200 } | { statusCode: 401 } | { statusCode: 503 };

const BEARER_PREFIX = 'Bearer ';

export const handleReceipt = ({
  store,
  collectorToKibanaToken,
  authorizationHeader,
  body,
}: HandleReceiptInput): HandleReceiptResult => {
  if (!collectorToKibanaToken) {
    return { statusCode: 503 };
  }

  const presented = authorizationHeader?.startsWith(BEARER_PREFIX)
    ? authorizationHeader.slice(BEARER_PREFIX.length)
    : undefined;

  if (presented !== collectorToKibanaToken) {
    return { statusCode: 401 };
  }

  store.markAccepted({
    verificationId: body.verificationId,
    apiKeyId: body.apiKeyId,
    endpointId: body.endpointId,
    ingestPath: body.ingestPath,
    signal: body.signal,
    receivedAt: body.receivedAt,
  });

  return { statusCode: 200 };
};
