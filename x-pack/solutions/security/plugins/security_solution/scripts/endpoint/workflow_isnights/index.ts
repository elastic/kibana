/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { ok } from 'assert';
import { indexWorkflowInsights } from '../../../common/endpoint/data_loaders/index_workflow_insights';
import { createEsClient } from '../common/stack_services';

export const cli = () => {
  run(
    async (options) => {
      try {
        const totalCount = options.flags.count;
        options.log.success(`Loading ${totalCount} workflow insights`);

        const startTime = new Date().getTime();
        await workflowInsightsLoader(options);
        const endTime = new Date().getTime();

        options.log.success(`${totalCount} workflow insights loaded`);
        options.log.info(`Loading ${totalCount} workflow insights took ${endTime - startTime}ms`);
      } catch (e) {
        options.log.error(e);
        throw createFailError(e.message);
      }
    },
    {
      description: 'Workflow Insights ES Loader',
      flags: {
        string: [
          'elasticsearch',
          'username',
          'password',
          'endpointId',
          'count',
          'os',
          'antivirus',
          'path',
        ],
        default: {
          elasticsearch: 'http://localhost:9200',
          username: 'elastic',
          password: 'changeme',
          count: 5,
          os: 'linux',
          antivirus: 'ClamAV',
          path: '/usr/bin/clamscan',
        },
        help: `
        --endpointId       Required. The endpoint ID to use for generating workflow insights.
        --elasticsearch    Optional. The URL to Elasticsearch. Default: http://localhost:9200
        --username         Optional. The username to use for authentication. Default: elastic
        --password         Optional. The password to use for authentication. Default: changeme
        --count            Optional. The number of workflow insights to generate. Default: 5
        --os               Optional. The OS to use for generating workflow insights. Default: linux
        --antivirus        Optional. The antivirus to use for generating workflow insights. Default: ClamAV
        --path             Optional. The executable path of the AV to use for generating workflow insights. Default: /usr/bin/clamscan
        `,
        examples: `
        Load 5 workflow insights, using the default values - Linux, ClamAV, /usr/bin/clamscan on the endpoint with ID 8ee2a3a4-ca2b-4884-ae20-8b17d31837b6
        node ./load_workflow_insights.js --endpointId 8ee2a3a4-ca2b-4884-ae20-8b17d31837b6
        Load 10 workflow insights for Malwarebytes with path of C:\\Program Files\\Malwarebytes\\Anti-Malware\\mbam.exe on Windows endpoint with ID 8ee2a3a4-ca2b-4884-ae20-8b17d31837b6
        node ./load_workflow_insights.js --endpointId 8ee2a3a4-ca2b-4884-ae20-8b17d31837b6 --count 10 --os windows --antivirus Malwarebytes --path 'C:\\Program Files\\Malwarebytes\\Anti-Malware\\mbam.exe'
        `,
      },
    }
  );
};

const workflowInsightsLoader: RunFn = async ({ flags, log }) => {
  const url = flags.elasticsearch as string;
  const username = flags.username as string;
  const password = flags.password as string;
  const endpointId = flags.endpointId as string;
  const os = flags.os as 'linux' | 'windows' | 'macos';
  const antivirus = flags.antivirus as string;
  const path = flags.path as string;
  const count = Number(flags.count);

  const getRequiredArgMessage = (argName: string) => `${argName} argument is required`;

  ok(endpointId, getRequiredArgMessage('endpointId'));
  if (os) ok(['linux', 'windows', 'macos'].includes(os), getRequiredArgMessage('os'));

  const esClient = createEsClient({ url, username, password });

  await indexWorkflowInsights({ esClient, log, endpointId, os, count, antivirus, path });
};
