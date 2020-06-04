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
import { COMMON_REQUEST_HEADERS } from '../ml/common';
import { SavedObjectType } from '../ml/test_resources';

export function TransformAPIProvider({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const log = getService('log');
  const retry = getService('retry');
  const esSupertest = getService('esSupertest');
  const supertest = getService('supertest');

  return {
    async createIndices(indices: string) {
      log.debug(`Creating indices: '${indices}'...`);
      if (await es.indices.exists({ index: indices, allowNoIndices: false })) {
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
      if (!(await es.indices.exists({ index: indices, allowNoIndices: false }))) {
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
        if (await es.indices.exists({ index: indices, allowNoIndices: false })) {
          return true;
        } else {
          throw new Error(errorMsg || `indices '${indices}' should exist`);
        }
      });
    },

    async waitForIndicesNotToExist(indices: string, errorMsg?: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if (!(await es.indices.exists({ index: indices, allowNoIndices: false }))) {
          return true;
        } else {
          throw new Error(errorMsg || `indices '${indices}' should not exist`);
        }
      });
    },

    async cleanTransformIndices() {
      await this.deleteIndices('.transform-*');
    },

    async createIndexPattern(title: string, timeFieldName?: string): Promise<string> {
      log.debug(
        `Creating index pattern with title '${title}'${
          timeFieldName !== undefined ? ` and time field '${timeFieldName}'` : ''
        }`
      );

      const createResponse = await supertest
        .post(`/api/saved_objects/${SavedObjectType.INDEX_PATTERN}`)
        .set(COMMON_REQUEST_HEADERS)
        .send({ attributes: { title, timeFieldName } })
        .expect(200)
        .then((res: any) => res.body);

      log.debug(` > Created with id '${createResponse.id}'`);
      return createResponse.id;
    },

    async getSavedObjectIdByTitle(
      title: string,
      objectType: SavedObjectType
    ): Promise<string | undefined> {
      log.debug(`Searching for '${objectType}' with title '${title}'...`);
      const findResponse = await supertest
        .get(`/api/saved_objects/_find?type=${objectType}`)
        .set(COMMON_REQUEST_HEADERS)
        .expect(200)
        .then((res: any) => res.body);

      for (const savedObject of findResponse.saved_objects) {
        const objectTitle = savedObject.attributes.title;
        if (objectTitle === title) {
          log.debug(` > Found '${savedObject.id}'`);
          return savedObject.id;
        }
      }
      log.debug(` > Not found`);
    },

    async getIndexPatternId(title: string): Promise<string | undefined> {
      return this.getSavedObjectIdByTitle(title, SavedObjectType.INDEX_PATTERN);
    },

    async deleteIndexPattern(title: string) {
      log.debug(`Deleting index pattern with title '${title}'...`);

      const indexPatternId = await this.getIndexPatternId(title);
      if (indexPatternId === undefined) {
        log.debug(`Index pattern with title '${title}' does not exists. Nothing to delete.`);
        return;
      } else {
        await supertest
          .delete(`/api/saved_objects/${SavedObjectType.INDEX_PATTERN}/${indexPatternId}`)
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        log.debug(` > Deleted index pattern with id '${indexPatternId}'`);
      }
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

      await this.waitForTransformJobToExist(
        transformId,
        `expected transform '${transformId}' to be created`
      );
    },

    async createIndexPatternIfNeeded(title: string, timeFieldName?: string): Promise<string> {
      const indexPatternId = await this.getIndexPatternId(title);
      if (indexPatternId !== undefined) {
        log.debug(`Index pattern with title '${title}' already exists. Nothing to create.`);
        return indexPatternId;
      } else {
        return await this.createIndexPattern(title, timeFieldName);
      }
    },

    async waitForIndexPatternNotToExist(title: string) {
      await retry.waitForWithTimeout(
        `index pattern '${title}' to not exist`,
        5 * 1000,
        async () => {
          const indexPatternId = await this.getIndexPatternId(title);
          if (!indexPatternId) {
            return true;
          } else {
            throw new Error(`Index pattern '${title}' should not exist.`);
          }
        }
      );
    },

    async waitForTransformJobToExist(transformId: string, errorMsg?: string) {
      await retry.waitForWithTimeout(`'${transformId}' to exist`, 5 * 1000, async () => {
        if (await this.getTransform(transformId, 200)) {
          return true;
        } else {
          throw new Error(errorMsg || `expected transform '${transformId}' to exist`);
        }
      });
    },
    async waitForTransformJobNotToExist(transformId: string, errorMsg?: string) {
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
