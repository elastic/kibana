/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginFunctionalProviderContext } from 'test/plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, loadTestFile }: PluginFunctionalProviderContext) {
  const esArchiver = getService('esArchiver');

  describe('search examples', function () {
    this.tags('ciGroup13');
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('lens/basic'); // need at least one index pattern
    });

    after(async () => {
      await esArchiver.unload('lens/basic');
    });

    loadTestFile(require.resolve('./search_session_example'));
    loadTestFile(require.resolve('./search_example'));
    loadTestFile(require.resolve('./search_sessions_cache'));
  });
}
