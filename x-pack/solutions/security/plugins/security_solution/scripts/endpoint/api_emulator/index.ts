/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { dump } from '../common/utils';
import { startExternalEdrServerEmulator } from './external_edr_server_emulator';
import type { ExternalEdrServerEmulatorCoreServices } from './external_edr_server_emulator.types';
import { createRuntimeServices } from '../common/stack_services';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';

export {
  startExternalEdrServerEmulator,
  type StartExternalEdrServerEmulatorOptions,
} from './external_edr_server_emulator';
export * from './external_edr_server_emulator.types';

export const cli = () => {
  run(
    cliRunner,

    // Options
    {
      description: `Start external API emulator`,
      flags: {
        string: ['kibana', 'elastic', 'username', 'password', 'apiKey'],
        boolean: ['asSuperuser'],
        default: {
          kibana: 'http://127.0.0.1:5601',
          elasticsearch: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          apiKey: '',
          asSuperuser: false,
          port: 0,
        },
        help: `
        --port              The port number where the server should listen on
                            (Default is 0 - which means an available port is assigned randomly)
        --username          User name to be used for auth against elasticsearch and
                            kibana (Default: elastic).
                            **IMPORTANT:** if 'asSuperuser' option is not used, then the
                            user defined here MUST have 'superuser' AND 'kibana_system' roles
        --password          User name Password (Default: changeme)
        --apiKey            An API key to use for communication with Kibana/Elastisearch. Would be
                            used instead of username/password
        --asSuperuser       If defined, then a Security super user will be created using the
                            the credentials defined via 'username' and 'password' options. This
                            new user will then be used to run this utility.
        --kibana            The url to Kibana (Default: http://127.0.0.1:5601)
        --elasticsearch     The url to Elasticsearch (Default: http://127.0.0.1:9200)
      `,
      },
    }
  );
};

const cliRunner: RunFn = async (cliContext) => {
  const username = cliContext.flags.username as string;
  const password = cliContext.flags.password as string;
  const apiKey = cliContext.flags.apiKey as string;
  const kibanaUrl = cliContext.flags.kibana as string;
  const elasticsearchUrl = cliContext.flags.elasticsearch as string;
  const asSuperuser = cliContext.flags.asSuperuser as boolean;
  const log = cliContext.log;
  const port = Number(cliContext.flags.port as string);

  createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

  const { kbnClient, esClient } = await createRuntimeServices({
    username,
    password,
    apiKey,
    kibanaUrl,
    elasticsearchUrl,
    asSuperuser,
    log,
  });

  const coreServices: ExternalEdrServerEmulatorCoreServices = {
    get kbnClient() {
      return kbnClient;
    },
    get esClient() {
      return esClient;
    },
    get logger() {
      return log;
    },
  };

  const emulatorServer = await startExternalEdrServerEmulator({
    port,
    coreServices,
  });

  log.debug(`Server info:\n${dump(emulatorServer.info)}`);

  await emulatorServer.stopped;
};
