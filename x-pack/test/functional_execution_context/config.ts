/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { FtrConfigProviderContext } from '@kbn/test';
import { logFilePath } from './test_utils';

const alertTestPlugin = Path.resolve(__dirname, './fixtures/plugins/alerts');

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../test/functional/config'));

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
    testFiles: [require.resolve('./tests/')],
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

        '--server.requestId.allowFromAnyIp=true',
        '--logging.appenders.file.type=file',
        `--logging.appenders.file.fileName=${logFilePath}`,
        '--logging.appenders.file.layout.type=json',

        '--logging.loggers[0].name=elasticsearch.query',
        '--logging.loggers[0].level=all',
        `--logging.loggers[0].appenders=${JSON.stringify(['file'])}`,

        '--logging.loggers[1].name=execution_context',
        '--logging.loggers[1].level=debug',
        `--logging.loggers[1].appenders=${JSON.stringify(['file'])}`,

        '--logging.loggers[2].name=http.server.response',
        '--logging.loggers[2].level=all',
        `--logging.loggers[2].appenders=${JSON.stringify(['file'])}`,
        `--xpack.alerting.rules.minimumScheduleInterval.value="1s"`,
      ],
    },
  };
}
