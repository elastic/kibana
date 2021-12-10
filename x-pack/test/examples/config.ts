/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { resolve } from 'path';
import fs from 'fs';
// @ts-expect-error https://github.com/elastic/kibana/issues/95679
import { KIBANA_ROOT } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('../functional/config'));

  // Find all folders in /examples and /x-pack/examples since we treat all them as plugin folder
  const examplesFiles = fs.readdirSync(resolve(KIBANA_ROOT, 'examples'));
  const examples = examplesFiles.filter((file) =>
    fs.statSync(resolve(KIBANA_ROOT, 'examples', file)).isDirectory()
  );

  const xpackExamplesFiles = fs.readdirSync(resolve(KIBANA_ROOT, 'x-pack/examples'));
  const xpackExamples = xpackExamplesFiles.filter((file) =>
    fs.statSync(resolve(KIBANA_ROOT, 'x-pack/examples', file)).isDirectory()
  );

  return {
    // default to the xpack functional config
    ...xpackFunctionalConfig.getAll(),

    junit: {
      reportName: 'X-Pack Example plugin functional tests',
    },

    testFiles: [
      require.resolve('./search_examples'),
      require.resolve('./embedded_lens'),
      require.resolve('./reporting_examples'),
    ],

    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),

      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        // Required to load new platform plugins via `--plugin-path` flag.
        '--env.name=development',
        ...examples.map(
          (exampleDir) => `--plugin-path=${resolve(KIBANA_ROOT, 'examples', exampleDir)}`
        ),
        ...xpackExamples.map(
          (exampleDir) => `--plugin-path=${resolve(KIBANA_ROOT, 'x-pack/examples', exampleDir)}`
        ),
      ],
    },
  };
}
