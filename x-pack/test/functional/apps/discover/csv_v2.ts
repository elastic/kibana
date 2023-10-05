/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../reporting_api_integration/ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  const log = getService('log');

  const cleanupLogstash = async () => {
    const logstashIndices = await es.indices.get({
      index: 'logstash-*',
      allow_no_indices: true,
      expand_wildcards: 'all',
      ignore_unavailable: true,
    });
    await Promise.all(
      Object.keys(logstashIndices.body ?? {}).map(async (logstashIndex) => {
        log.info(`deleting ${logstashIndex}`);
        await es.indices.delete({
          index: logstashIndex,
        });
      })
    );
  };

  describe('CSV Generation from Saved Search ID', () => {
    before(async () => {
      // clear any previous UI Settings
      await kibanaServer.uiSettings.replace({});

      // explicitly delete all pre-existing logstash indices, since we have exports with no time filter
      log.info(`deleting logstash indices`);
      await cleanupLogstash();

      log.info(`updating Advanced Settings`);
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': false,
        'dateFormat:tz': 'UTC',
        dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
      });
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({});
    });
  });
};
