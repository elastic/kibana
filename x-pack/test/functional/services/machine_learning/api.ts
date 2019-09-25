/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { isEmpty } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningAPIProvider({ getService }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');

  return {
    async deleteIndices(indices: string) {
      log.debug(`Deleting indices: '${indices}'...`);
      const deleteResponse = await es.indices.delete({
        index: indices,
      });
      expect(deleteResponse)
        .to.have.property('acknowledged')
        .eql(true);

      await retry.waitForWithTimeout(`'${indices}' indices to be deleted`, 30 * 1000, async () => {
        const getRepsonse = await es.indices.get({
          index: indices,
        });

        if (isEmpty(getRepsonse)) {
          return true;
        } else {
          throw new Error(`expected indices '${indices}' to be deleted`);
        }
      });
    },

    async cleanMlIndices() {
      await this.deleteIndices('.ml-*');
    },
  };
}
