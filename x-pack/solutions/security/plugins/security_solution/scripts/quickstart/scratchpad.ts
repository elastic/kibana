/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { HORIZONTAL_LINE } from '../endpoint/common/constants';
import { createEsClient, createKbnClient } from '../endpoint/common/stack_services';
import { createToolingLogger } from '../../common/endpoint/data_loaders/utils';
import { Client as DetectionsClient } from '../../common/api/quickstart_client.gen';
// TEMPORARY (revert before committing): wiring for the ML coverage-loss seeder.
import { seedMlCoverageLossState } from './modules/ml_coverage_loss';

export const cli = () => {
  run(
    async (cliContext) => {
      /**
       * START Client setup - Generic Kibana Client, ES Client, and Detections/Lists/Exceptions specific clients
       */
      createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

      const log = cliContext.log;

      const kbnClient = createKbnClient({
        log,
        url: cliContext.flags.kibana as string,
        username: cliContext.flags.username as string,
        password: cliContext.flags.password as string,
        apiKey: cliContext.flags.apikey as string,
      });

      const esClient = createEsClient({
        log,
        url: cliContext.flags.elasticsearch as string,
        username: cliContext.flags.username as string,
        password: cliContext.flags.password as string,
        apiKey: cliContext.flags.apikey as string,
      });

      const detectionsClient = new DetectionsClient({ kbnClient, log });

      log.info(`${HORIZONTAL_LINE}
 Environment Data Loader
${HORIZONTAL_LINE}
`);

      log.info(`Loading data to: ${kbnClient.resolveUrl('')}`);

      /**
       * END Client setup
       * START Custom data loader logic
       */

      // TEMPORARY (revert before committing): seed the ML coverage-loss upgrade repro state.
      await seedMlCoverageLossState({
        esClient,
        kbnClient,
        detectionsClient,
        log,
        installAllAffectedJobs: true,
      });

      /**
       * END Custom data loader logic
       */
    },

    // Options
    {
      description: `Loads data into an environment for testing/development`,
      flags: {
        string: ['kibana', 'username', 'password', 'apikey'],
        default: {
          kibana: 'http://127.0.0.1:5601',
          elasticsearch: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
        },
        allowUnexpected: false,
        help: `
        --username                      User name to be used for auth against elasticsearch and
                                        kibana (Default: elastic).
        --password                      User name Password (Default: changeme)
        --kibana                        The url to Kibana (Default: http://127.0.0.1:5601)
        --apikey                        The API key for authentication, overrides username/password
      `,
      },
    }
  );
};
