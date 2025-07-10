/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const logger = getService('log');

  describe('@ess @serverless @serverlessQA ES_ARCHIVER TESTS', () => {
    describe('reloading archives before each test', () => {
      beforeEach(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_3'
        );
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_3'
        );
      });

      describe('assertions on inserted documents', () => {
        Array(100)
          .fill(0)
          .forEach(() => {
            it('should have one document from the timestamp_override_3 archive', async () => {
              const searchResponse = await es.search({
                index: 'myfakeindex-3',
              });

              logger.info('shards', searchResponse._shards);
              logger.info('hits.total', searchResponse.hits.total);

              expect(searchResponse.hits.hits).toEqual([
                expect.objectContaining({
                  _index: 'myfakeindex-3',
                  _source: {
                    message: 'hello world 3',
                    '@timestamp': '2020-12-16T15:16:18.570Z',
                  },
                }),
              ]);
            });
          });
      });
    });
  });
};
