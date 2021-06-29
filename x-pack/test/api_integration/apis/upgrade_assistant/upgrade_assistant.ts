/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { reindexOperationWithLargeErrorMessage } from './reindex_operation_with_large_error_message';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('Upgrade Assistant', () => {
    describe('Reindex operation saved object', () => {
      const dotKibanaIndex = '.kibana';
      const fakeSavedObjectId = 'fakeSavedObjectId';

      after(async () => {
        // Clean up the fake saved object we created. This will error if the test failed.
        return await es.delete({ index: dotKibanaIndex, id: fakeSavedObjectId });
      });

      it('is indexed successfully with immense error message', async () => {
        // Guards against regression of https://github.com/elastic/kibana/pull/71710.
        const result = await es.create({
          index: dotKibanaIndex, // In normal operation this would be the .kibana-n index.
          id: fakeSavedObjectId,
          body: reindexOperationWithLargeErrorMessage,
        });
        expect(result).to.be.ok();
      });
    });

    describe('Update index settings route', () => {
      const indexName = 'update_settings_test_index';
      const indexSettings = {
        number_of_shards: '3',
        number_of_replicas: '2',
        refresh_interval: '1s',
      };

      before(async () => {
        // Create an index with settings that can be used for testing
        try {
          await es.indices.create({
            index: indexName,
            body: {
              settings: {
                index: indexSettings,
              },
            },
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Setup error] Error creating index');
          throw err;
        }
      });

      after(async () => {
        // Delete index created for test
        try {
          await es.indices.delete({
            index: indexName,
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Cleanup error] Error deleting index');
          throw err;
        }
      });

      it('removes index settings', async () => {
        const { body } = await supertest
          .post(`/api/upgrade_assistant/${indexName}/index_settings`)
          .set('kbn-xsrf', 'xxx')
          .send({
            settings: ['refresh_interval'], // index setting to remove
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });

        // Refetch the index and verify settings were updated correctly
        try {
          const { body: indexSettingsResponse } = await es.indices.getSettings({
            index: indexName,
          });

          // @ts-expect-error @elastic/elasticsearch supports flatten 'index.*' keys only
          const updatedIndexSettings = indexSettingsResponse[indexName].settings.index;

          // Verify number_of_shards and number_of_replicas are unchanged
          expect(updatedIndexSettings.number_of_shards).to.eql(indexSettings.number_of_shards);
          expect(updatedIndexSettings.number_of_replicas).to.eql(indexSettings.number_of_replicas);
          // Verify refresh_interval no longer exists
          expect(updatedIndexSettings.refresh_interval).to.be.eql(undefined);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Error] Unable to fetch index and verify index settings');
          throw err;
        }
      });

      it('handles error', async () => {
        const indexDoesNotExistName = 'index_does_not_exist';
        const { body } = await supertest
          .post(`/api/upgrade_assistant/${indexDoesNotExistName}/index_settings`)
          .set('kbn-xsrf', 'xxx')
          .send({
            settings: ['refresh_interval'], // index setting to remove
          })
          .expect(500);

        expect(body.error).to.eql('Internal Server Error');
      });
    });
  });
}
