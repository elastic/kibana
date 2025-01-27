/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createRuntimeServices } from '../common/stack_services';
import { startFleetServer } from '../common/fleet_server/fleet_server_services';

export const cli = async () => {
  return run(
    async (cliContext: RunContext) => {
      const username = cliContext.flags.username as string;
      const password = cliContext.flags.password as string;
      const kibanaUrl = cliContext.flags.kibanaUrl as string;
      const elasticUrl = cliContext.flags.elasticUrl as string;
      const version = cliContext.flags.version as string;
      const policy = cliContext.flags.policy as string;
      const port = cliContext.flags.port as unknown as number;
      const force = cliContext.flags.force as boolean;
      const log = cliContext.log;

      const { kbnClient, log: logger } = await createRuntimeServices({
        kibanaUrl,
        elasticsearchUrl: elasticUrl,
        username,
        password,
        log,
      });

      const runningServer = await startFleetServer({
        kbnClient,
        logger,
        policy,
        port,
        version,
        force,
      });

      log.info(`\n\n${runningServer.info}`);
    },
    {
      description: 'Start fleet-server locally and connect it to Kibana/ES',
      flags: {
        string: ['kibanaUrl', 'elasticUrl', 'username', 'password', 'version', 'policy'],
        boolean: ['force'],
        default: {
          kibanaUrl: 'http://127.0.0.1:5601',
          elasticUrl: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
          version: '',
          policy: '',
          force: false,
          port: 8220,
        },
        help: `
      --version           Optional. The Agent version to be used when installing fleet server.
                          Default: uses the same version as the stack (kibana). Version
                          can also be from 'SNAPSHOT'.
                          NOTE: this value will be specifically set to 'latest' when ran against
                          kibana in serverless mode.
                          Examples: 8.6.0, 8.7.0-SNAPSHOT
      --policy            Optional. The UUID of the agent policy that should be used to enroll
                          fleet-server with Kibana/ES (Default: uses existing (if found) or
                          creates a new one)
      --force             Optional. If true, then fleet-server will be started and connected to
                          kibana even if one seems to already be configured.
      --port              Optional. The port number where fleet-server will listen for requests.
                          (Default: 8220)
      --username          Optional. User name to be used for auth against elasticsearch and
                          kibana (Default: elastic).
      --password          Optional. Password associated with the username (Default: changeme)
      --kibanaUrl         Optional. The url to Kibana (Default: http://127.0.0.1:5601)
      --elasticUrl        Optional. The url to Elasticsearch (Default: http://127.0.0.1:9200)
`,
      },
    }
  );
};
