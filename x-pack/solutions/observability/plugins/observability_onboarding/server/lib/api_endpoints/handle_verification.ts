/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiEndpointId } from '../../../common/api_endpoints';
import type { VerificationStatus, VerificationStore } from './verification_store';

export interface ApiEndpointVerificationResponse {
  status: VerificationStatus;
  detectionActive: boolean;
  endpointId?: ApiEndpointId;
  ingestPath?: string;
  signal?: string;
  lastSeen?: string;
}

export const handleVerification = ({
  store,
  verificationId,
}: {
  store: VerificationStore;
  verificationId: string;
}): ApiEndpointVerificationResponse => {
  const session = store.getByVerificationId(verificationId);

  if (!session) {
    return { status: 'expired', detectionActive: false };
  }

  return {
    status: session.status,
    detectionActive: session.detectionActive,
    endpointId: session.endpointId,
    ingestPath: session.ingestPath,
    signal: session.signal,
    lastSeen: session.receivedAt,
  };
};
