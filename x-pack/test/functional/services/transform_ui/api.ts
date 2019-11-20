/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformAPIProvider({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const log = getService('log');
  const retry = getService('retry');

  return {
    async deleteIndices(indices: string) {
      log.debug(`Deleting indices: '${indices}'...`);
      if ((await es.indices.exists({ index: indices, allowNoIndices: false })) === false) {
        log.debug(`Indices '${indices}' don't exist. Nothing to delete.`);
        return;
      }

      const deleteResponse = await es.indices.delete({
        index: indices,
      });
      expect(deleteResponse)
        .to.have.property('acknowledged')
        .eql(true, 'Response for delete request should be acknowledged');

      await retry.waitForWithTimeout(`'${indices}' indices to be deleted`, 30 * 1000, async () => {
        if ((await es.indices.exists({ index: indices, allowNoIndices: false })) === false) {
          return true;
        } else {
          throw new Error(`expected indices '${indices}' to be deleted`);
        }
      });
    },

    async cleanTransformIndices() {
      await this.deleteIndices('.transform-*');
    },
  };
}
