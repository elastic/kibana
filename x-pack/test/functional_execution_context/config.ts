/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext, getKibanaCliLoggers } from '@kbn/test';
import { logFilePath } from './test_utils';

const alertTestPlugin = Path.resolve(__dirname, './plugins/alerts');

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  const servers = {
    ...functionalConfig.get('servers'),
    elasticsearch: {
      ...functionalConfig.get('servers.elasticsearch'),
      protocol: 'https',
    },
  };

  return {
    ...functionalConfig.getAll(),
    rootTags: ['skipCloud'],
    testFiles: [require.resolve('./tests')],
    junit: {
      reportName: 'Execution Context Functional Tests',
    },
    servers,
    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      ssl: true,
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${alertTestPlugin}`,
        `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,

        `--xpack.alerting.rules.minimumScheduleInterval.value="1s"`,

        '--server.requestId.allowFromAnyIp=true',
        '--logging.appenders.file.type=file',
        `--logging.appenders.file.fileName=${logFilePath}`,
        '--logging.appenders.file.layout.type=json',

        `--logging.loggers=${JSON.stringify([
          ...getKibanaCliLoggers(functionalConfig.get('kbnTestServer.serverArgs')),

          {
            name: 'elasticsearch.query',
            level: 'all',
            appenders: ['file'],
          },
          {
            name: 'execution_context',
            level: 'debug',
            appenders: ['file'],
          },
          {
            name: 'http.server.response',
            level: 'all',
            appenders: ['file'],
          },
        ])}`,
      ],
    },
  };
}
