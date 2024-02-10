/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  return {
    ...functionalConfig.getAll(),

    testFiles: [require.resolve('./tests')],

    // kbnTestServer: {
    //   dockerImage:
    //     'docker.elastic.co/kibana-ci/kibana-ubi-fips:8.13.0-SNAPSHOT-2566dab061e9d5c10e6c926e5d192c477fed41e1',
    // },
  };
}
