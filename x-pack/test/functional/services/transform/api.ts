/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

import { TRANSFORM_STATE } from '../../../../plugins/transform/common';
import {
  TransformPivotConfig,
  TransformStats,
} from '../../../../plugins/transform/public/app/common';

export function TransformAPIProvider({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const log = getService('log');
  const retry = getService('retry');
  const esSupertest = getService('esSupertest');

  return {
    async createIndices(indices: string) {
      log.debug(`Creating indices: '${indices}'...`);
      if ((await es.indices.exists({ index: indices, allowNoIndices: false })) === true) {
        log.debug(`Indices '${indices}' already exist. Nothing to create.`);
        return;
      }

      const createResponse = await es.indices.create({ index: indices });
      expect(createResponse)
        .to.have.property('acknowledged')
        .eql(true, 'Response for create request indices should be acknowledged.');

      await this.waitForIndicesToExist(indices, `expected ${indices} to be created`);
    },

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

      await this.waitForIndicesNotToExist(indices, `expected indices '${indices}' to be deleted`);
    },

    async waitForIndicesToExist(indices: string, errorMsg?: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if ((await es.indices.exists({ index: indices, allowNoIndices: false })) === true) {
          return true;
        } else {
          throw new Error(errorMsg || `indices '${indices}' should exist`);
        }
      });
    },

    async waitForIndicesNotToExist(indices: string, errorMsg?: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if ((await es.indices.exists({ index: indices, allowNoIndices: false })) === false) {
          return true;
        } else {
          throw new Error(errorMsg || `indices '${indices}' should not exist`);
        }
      });
    },

    async cleanTransformIndices() {
      await this.deleteIndices('.transform-*');
    },

    async getTransformStats(transformId: string): Promise<TransformStats> {
      log.debug(`Fetching transform stats for transform ${transformId}`);
      const statsResponse = await esSupertest
        .get(`/_transform/${transformId}/_stats`)
        .expect(200)
        .then((res: any) => res.body);

      expect(statsResponse.transforms).to.have.length(
        1,
        `Expected transform stats to contain exactly 1 object (got '${statsResponse.transforms.length}')`
      );
      return statsResponse.transforms[0];
    },

    async getTransformState(transformId: string): Promise<TRANSFORM_STATE> {
      const stats = await this.getTransformStats(transformId);
      return stats.state;
    },

    async waitForTransformState(transformId: string, expectedState: TRANSFORM_STATE) {
      await retry.waitForWithTimeout(
        `transform state to be ${expectedState}`,
        2 * 60 * 1000,
        async () => {
          const state = await this.getTransformState(transformId);
          if (state === expectedState) {
            return true;
          } else {
            throw new Error(`expected transform state to be ${expectedState} but got ${state}`);
          }
        }
      );
    },

    async waitForBatchTransformToComplete(transformId: string) {
      await retry.waitForWithTimeout(`batch transform to complete`, 2 * 60 * 1000, async () => {
        const stats = await this.getTransformStats(transformId);
        if (stats.state === TRANSFORM_STATE.STOPPED && stats.checkpointing.last.checkpoint === 1) {
          return true;
        } else {
          throw new Error(
            `expected batch transform to be stopped with last checkpoint = 1 (got status: '${stats.state}', checkpoint: '${stats.checkpointing.last.checkpoint}')`
          );
        }
      });
    },

    async getTransform(transformId: string, expectedCode = 200) {
      return await esSupertest.get(`/_transform/${transformId}`).expect(expectedCode);
    },

    async createTransform(transformConfig: TransformPivotConfig) {
      const transformId = transformConfig.id;
      log.debug(`Creating transform with id '${transformId}'...`);
      await esSupertest.put(`/_transform/${transformId}`).send(transformConfig).expect(200);

      await this.waitForTransformToExist(
        transformId,
        `expected transform '${transformId}' to be created`
      );
    },

    async waitForTransformToExist(transformId: string, errorMsg?: string) {
      await retry.waitForWithTimeout(`'${transformId}' to exist`, 5 * 1000, async () => {
        if (await this.getTransform(transformId, 200)) {
          return true;
        } else {
          throw new Error(errorMsg || `expected transform '${transformId}' to exist`);
        }
      });
    },
    async waitForTransformNotToExist(transformId: string, errorMsg?: string) {
      await retry.waitForWithTimeout(`'${transformId}' to exist`, 5 * 1000, async () => {
        if (await this.getTransform(transformId, 404)) {
          return true;
        } else {
          throw new Error(errorMsg || `expected transform '${transformId}' to not exist`);
        }
      });
    },

    async startTransform(transformId: string) {
      log.debug(`Starting transform '${transformId}' ...`);
      await esSupertest.post(`/_transform/${transformId}/_start`).expect(200);
    },

    async createAndRunTransform(transformConfig: TransformPivotConfig) {
      await this.createTransform(transformConfig);
      await this.startTransform(transformConfig.id);
      if (transformConfig.sync === undefined) {
        // batch mode
        await this.waitForBatchTransformToComplete(transformConfig.id);
      } else {
        // continuous mode
        await this.waitForTransformState(transformConfig.id, TRANSFORM_STATE.STARTED);
      }
    },
  };
}
