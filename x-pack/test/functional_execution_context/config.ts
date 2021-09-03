/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../test/functional/config'));

  return {
    ...functionalConfig.getAll(),
    rootTags: ['skipCloud'],
    testFiles: [require.resolve('./tests/')],
    junit: {
      reportName: 'Execution Context Functional Tests',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),

        '--execution_context.enabled=true',
        '--logging.appenders.file.type=file',
        `--logging.appenders.file.fileName=${Path.resolve(__dirname, './kibana.log')}`,
        '--logging.appenders.file.layout.type=json',

        '--logging.loggers[0].name=elasticsearch.query',
        '--logging.loggers[0].level=all',
        `--logging.loggers[0].appenders=${JSON.stringify(['file'])}`,

        '--logging.loggers[1].name=execution_context',
        '--logging.loggers[1].level=debug',
        `--logging.loggers[1].appenders=${JSON.stringify(['file'])}`,
      ],
    },
  };
}
