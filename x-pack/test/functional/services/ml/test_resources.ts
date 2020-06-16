/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProvidedType } from '@kbn/test/types/ftr';
import { savedSearches } from './test_resources_data';
import { COMMON_REQUEST_HEADERS } from './common';
import { FtrProviderContext } from '../../ftr_provider_context';

export enum SavedObjectType {
  CONFIG = 'config',
  DASHBOARD = 'dashboard',
  INDEX_PATTERN = 'index-pattern',
  SEARCH = 'search',
  VISUALIZATION = 'visualization',
}

export type MlTestResourcesi = ProvidedType<typeof MachineLearningTestResourcesProvider>;

export function MachineLearningTestResourcesProvider({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const supertest = getService('supertest');
  const retry = getService('retry');

  return {
    async setKibanaTimeZoneToUTC() {
      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
      });
    },

    async resetKibanaTimeZone() {
      await kibanaServer.uiSettings.unset('dateFormat:tz');
    },

    async savedObjectExists(id: string, objectType: SavedObjectType): Promise<boolean> {
      const response = await supertest.get(`/api/saved_objects/${objectType}/${id}`);
      return response.status === 200;
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

    async getSavedSearchId(title: string): Promise<string | undefined> {
      return this.getSavedObjectIdByTitle(title, SavedObjectType.SEARCH);
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

    async createIndexPatternIfNeeded(title: string, timeFieldName?: string): Promise<string> {
      const indexPatternId = await this.getIndexPatternId(title);
      if (indexPatternId !== undefined) {
        log.debug(`Index pattern with title '${title}' already exists. Nothing to create.`);
        return indexPatternId;
      } else {
        return await this.createIndexPattern(title, timeFieldName);
      }
    },

    async assertIndexPatternNotExist(title: string) {
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

    async createSavedSearch(title: string, body: object): Promise<string> {
      log.debug(`Creating saved search with title '${title}'`);

      const createResponse = await supertest
        .post(`/api/saved_objects/${SavedObjectType.SEARCH}`)
        .set(COMMON_REQUEST_HEADERS)
        .send(body)
        .expect(200)
        .then((res: any) => res.body);

      log.debug(` > Created with id '${createResponse.id}'`);
      return createResponse.id;
    },

    async createSavedSearchIfNeeded(savedSearch: any): Promise<string> {
      const title = savedSearch.requestBody.attributes.title;
      const savedSearchId = await this.getSavedSearchId(title);
      if (savedSearchId !== undefined) {
        log.debug(`Saved search with title '${title}' already exists. Nothing to create.`);
        return savedSearchId;
      } else {
        const body = await this.updateSavedSearchRequestBody(
          savedSearch.requestBody,
          savedSearch.indexPatternTitle
        );
        return await this.createSavedSearch(title, body);
      }
    },

    async updateSavedSearchRequestBody(body: object, indexPatternTitle: string): Promise<object> {
      const indexPatternId = await this.getIndexPatternId(indexPatternTitle);
      if (indexPatternId === undefined) {
        throw new Error(
          `Index pattern '${indexPatternTitle}' to base saved search on does not exist. `
        );
      }

      // inject index pattern id
      const updatedBody = JSON.parse(JSON.stringify(body), (_key, value) => {
        if (value === 'INDEX_PATTERN_ID_PLACEHOLDER') {
          return indexPatternId;
        } else {
          return value;
        }
      });

      // make searchSourceJSON node a string
      const searchSourceJsonNode = updatedBody.attributes.kibanaSavedObjectMeta.searchSourceJSON;
      const searchSourceJsonString = JSON.stringify(searchSourceJsonNode);
      updatedBody.attributes.kibanaSavedObjectMeta.searchSourceJSON = searchSourceJsonString;

      return updatedBody;
    },

    async createSavedSearchFarequoteFilterIfNeeded() {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteFilter);
    },

    async createSavedSearchFarequoteLuceneIfNeeded() {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteLucene);
    },

    async createSavedSearchFarequoteKueryIfNeeded() {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteKuery);
    },

    async createSavedSearchFarequoteFilterAndLuceneIfNeeded() {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteFilterAndLucene);
    },

    async createSavedSearchFarequoteFilterAndKueryIfNeeded() {
      await this.createSavedSearchIfNeeded(savedSearches.farequoteFilterAndKuery);
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

    async deleteSavedSearch(title: string) {
      log.debug(`Deleting saved search with title '${title}'...`);

      const savedSearchId = await this.getSavedSearchId(title);
      if (savedSearchId === undefined) {
        log.debug(`Saved search with title '${title}' does not exists. Nothing to delete.`);
        return;
      } else {
        await supertest
          .delete(`/api/saved_objects/${SavedObjectType.SEARCH}/${savedSearchId}`)
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        log.debug(` > Deleted saved searchwith id '${savedSearchId}'`);
      }
    },

    async deleteSavedSearches() {
      for (const search of Object.values(savedSearches)) {
        await this.deleteSavedSearch(search.requestBody.attributes.title);
      }
    },
  };
}
