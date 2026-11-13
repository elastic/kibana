/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as grpc from '@grpc/grpc-js';
import type { SandboxConnection } from './secrets';

export type SandboxProbeResult = 'authenticated' | 'unauthenticated' | 'unreachable';

/**
 * Checks a sandbox credential without starting a sandbox. sandbox-api authenticates a call before
 * it checks for the conversation id, so a call without one fails with INVALID_ARGUMENT for a valid
 * key and UNAUTHENTICATED for a wrong one.
 */
export const probeSandboxCredential = ({
  host,
  port,
  apiKey,
}: SandboxConnection): Promise<SandboxProbeResult> =>
  new Promise((resolve) => {
    const client = new grpc.Client(`${host}:${port}`, grpc.credentials.createSsl());
    const metadata = new grpc.Metadata();
    metadata.set('authorization', `ApiKey ${apiKey}`);
    client.makeUnaryRequest(
      '/sandbox.SandboxService/StatFiles',
      (request: Buffer) => request,
      (response: Buffer) => response,
      Buffer.alloc(0),
      metadata,
      { deadline: Date.now() + 15_000 },
      (error) => {
        client.close();
        if (!error || error.code === grpc.status.INVALID_ARGUMENT) resolve('authenticated');
        else if (error.code === grpc.status.UNAUTHENTICATED) resolve('unauthenticated');
        else resolve('unreachable');
      }
    );
  });
