/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as fs from 'fs';
import { load as loadYaml } from 'js-yaml';
import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const chromeConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  const configs = loadYaml(fs.readFileSync('/.buildkite/ftr_configs.yml', 'utf8'));

  const testFilePaths: string[] = configs.enabled;
  const testFiles: any[] = [];

  testFilePaths.forEach((testFilePath) => {
    testFiles.push(require.resolve(`/${testFilePath}`));
  });

  return {
    ...chromeConfig.getAll(),

    testFiles,

    suiteTags: {
      exclude: ['skipFIPS'],
    },

    junit: {
      reportName: 'FIPS x-pack Functional Tests',
    },
  };
}
