/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCrowdstrikeEmulator } from './emulator_plugins/crowdstrike';
import { handleProcessInterruptions } from '../common/nodejs_utils';
import { EmulatorServer } from './lib/emulator_server';
import type { ExternalEdrServerEmulatorCoreServices } from './external_edr_server_emulator.types';
import { getSentinelOneEmulator } from './emulator_plugins/sentinelone';

export interface StartExternalEdrServerEmulatorOptions {
  coreServices: ExternalEdrServerEmulatorCoreServices;
  /**
   * The port where the server should listen on. Default is `0` which means an available port is
   * auto-assigned.
   */
  port?: number;
}

/**
 * Starts a server that provides API emulator for external EDR systems in support of bi-directional
 * response actions.
 *
 * After staring the server, the `emulatorServer.stopped` property provides a way to `await` until it
 * is stopped
 *
 * @param options
 */
export const startExternalEdrServerEmulator = async ({
  port,
  coreServices,
}: StartExternalEdrServerEmulatorOptions): Promise<EmulatorServer> => {
  const emulator = new EmulatorServer<ExternalEdrServerEmulatorCoreServices>({
    logger: coreServices.logger,
    port: port ?? 0,
    services: coreServices,
  });

  // Register all emulators
  await emulator.register(getSentinelOneEmulator());
  await emulator.register(getCrowdstrikeEmulator());

  let wasStartedPromise: ReturnType<EmulatorServer['start']>;

  handleProcessInterruptions(
    async () => {
      wasStartedPromise = emulator.start();
      await wasStartedPromise;
      await emulator.stopped;
    },
    () => {
      coreServices.logger.warning(
        `Process was interrupted. Shutting down External EDR Server Emulator`
      );
      emulator.stop();
    }
  );

  // @ts-expect-error TS2454: Variable 'wasStartedPromise' is used before being assigned.
  await wasStartedPromise;
  return emulator;
};
