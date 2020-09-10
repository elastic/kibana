/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { reindexOperationWithLargeErrorMessage } from './reindex_operation_with_large_error_message';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');

  describe('Reindex operation saved object', function () {
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
}
