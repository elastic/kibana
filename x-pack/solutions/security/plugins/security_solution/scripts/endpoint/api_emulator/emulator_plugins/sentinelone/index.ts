/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalEdrServerEmulatorCoreServices } from '../..';
import { getSentinelOneRouteDefinitions } from './routes';
import type { EmulatorServerPlugin } from '../../lib/emulator_server.types';

export const getSentinelOneEmulator =
  (): EmulatorServerPlugin<ExternalEdrServerEmulatorCoreServices> => {
    const plugin: EmulatorServerPlugin<ExternalEdrServerEmulatorCoreServices> = {
      name: 'sentinelone',
      register({ router, expose, services }) {
        router.route(getSentinelOneRouteDefinitions());

        // TODO:PT define the interface for programmatically interact with sentinelone api emulator
        expose('setResponse', () => {
          services.logger.info('setResponse() is available');
        });
      },
    };

    return plugin;
  };
