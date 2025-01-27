/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { createEsClient, createKbnClient } from '../endpoint/common/stack_services';
import { HORIZONTAL_LINE } from '../endpoint/common/constants';
import { createToolingLogger } from '../../common/endpoint/data_loaders/utils';
import { loadAttackDiscoveryData } from './load';

export const cli = () => {
  run(
    async (cliContext) => {
      createToolingLogger.setDefaultLogLevelFromCliFlags(cliContext.flags);

      const log = cliContext.log;
      const kbnClient = createKbnClient({
        log,
        url: cliContext.flags.kibanaUrl as string,
        username: cliContext.flags.username as string,
        password: cliContext.flags.password as string,
      });
      const esClient = createEsClient({
        log,
        url: cliContext.flags.elasticsearchUrl as string,
        username: cliContext.flags.username as string,
        password: cliContext.flags.password as string,
      });

      log.info(`${HORIZONTAL_LINE}
 Environment Data Loader
${HORIZONTAL_LINE}
`);
      log.info(`Loading data to: ${kbnClient.resolveUrl('')}`);

      await loadAttackDiscoveryData({ kbnClient, esClient, log });
    },

    // Options
    {
      description: `Loads data into a environment for testing/development`,
      flags: {
        string: ['kibanaUrl', 'elasticsearchUrl', 'username', 'password'],
        default: {
          kibanaUrl: 'http://127.0.0.1:5601',
          elasticsearchUrl: 'http://127.0.0.1:9200',
          username: 'elastic',
          password: 'changeme',
        },
        allowUnexpected: false,
        help: `
        --username                      User name to be used for auth against elasticsearch and
                                        kibana (Default: elastic).
        --password                      User name Password (Default: changeme)
        --kibanaUrl                     The url to Kibana (Default: http://127.0.0.1:5601)
        --elasticsearchUrl              The url to Elasticsearch (Default: http://127.0.0.1:9200)
      `,
      },
    }
  );
};
