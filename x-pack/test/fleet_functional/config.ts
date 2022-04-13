/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('../functional/config.js'));

  return {
    ...xpackFunctionalConfig.getAll(),
    pageObjects,
    testFiles: [resolve(__dirname, './apps/fleet'), resolve(__dirname, './apps/home')],
    junit: {
      reportName: 'X-Pack Fleet Functional Tests',
    },
    services,
    apps: {
      ...xpackFunctionalConfig.get('apps'),
      ['fleet']: {
        pathname: '/app/fleet',
      },
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        // Enable debug fleet logs by default
        `--logging.loggers[0].name=plugins.fleet`,
        `--logging.loggers[0].level=debug`,
        `--logging.loggers[0].appenders=${JSON.stringify(['default'])}`,
      ],
    },
    layout: {
      fixedHeaderHeight: 200,
    },
  };
}
