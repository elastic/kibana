/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProvidedType } from '@kbn/test/types/ftr';
import { savedSearches, dashboards } from './test_resources_data';
import { COMMON_REQUEST_HEADERS } from './common_api';
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
  const es = getService('es');
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

    async savedObjectExistsById(id: string, objectType: SavedObjectType): Promise<boolean> {
      const response = await supertest.get(`/api/saved_objects/${objectType}/${id}`);
      return response.status === 200;
    },

    async savedObjectExistsByTitle(title: string, objectType: SavedObjectType): Promise<boolean> {
      const id = await this.getSavedObjectIdByTitle(title, objectType);
      if (id) {
        return await this.savedObjectExistsById(id, objectType);
      } else {
        return false;
      }
    },

    async getSavedObjectIdByTitle(
      title: string,
      objectType: SavedObjectType
    ): Promise<string | undefined> {
      log.debug(`Searching for '${objectType}' with title '${title}'...`);
      const findResponse = await supertest
        .get(`/api/saved_objects/_find?type=${objectType}&per_page=10000`)
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

    async getVisualizationId(title: string): Promise<string | undefined> {
      return this.getSavedObjectIdByTitle(title, SavedObjectType.VISUALIZATION);
    },

    async getDashboardId(title: string): Promise<string | undefined> {
      return this.getSavedObjectIdByTitle(title, SavedObjectType.DASHBOARD);
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

      await this.assertIndexPatternExistByTitle(title);

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
      await this.assertSavedObjectNotExistsByTitle(title, SavedObjectType.INDEX_PATTERN);
    },

    async createSavedSearch(title: string, body: object): Promise<string> {
      log.debug(`Creating saved search with title '${title}'`);

      const createResponse = await supertest
        .post(`/api/saved_objects/${SavedObjectType.SEARCH}`)
        .set(COMMON_REQUEST_HEADERS)
        .send(body)
        .expect(200)
        .then((res: any) => res.body);

      await this.assertSavedSearchExistByTitle(title);

      log.debug(` > Created with id '${createResponse.id}'`);
      return createResponse.id;
    },

    async createDashboard(title: string, body: object): Promise<string> {
      log.debug(`Creating dashboard with title '${title}'`);

      const createResponse = await supertest
        .post(`/api/saved_objects/${SavedObjectType.DASHBOARD}`)
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

    async setupBrokenAnnotationsIndexState(jobId: string) {
      // Creates a temporary annotations index with unsupported mappings.
      await es.indices.create({
        index: '.ml-annotations-6-wrong-mapping',
        body: {
          settings: {
            number_of_shards: 1,
          },
          mappings: {
            properties: {
              field1: { type: 'text' },
            },
          },
        },
      });

      // Ingests an annotation that will cause dynamic mapping to pick up the wrong field type.
      es.create({
        id: 'annotation_with_wrong_mapping',
        index: '.ml-annotations-6-wrong-mapping',
        body: {
          annotation: 'Annotation with wrong mapping',
          create_time: 1597393915910,
          create_username: '_xpack',
          timestamp: 1549756800000,
          end_timestamp: 1549756800000,
          job_id: jobId,
          modified_time: 1597393915910,
          modified_username: '_xpack',
          type: 'annotation',
          event: 'user',
          detector_index: 0,
        },
      });

      // Points the read/write aliases for annotations to the broken annotations index
      // so we can run tests against a state where annotation endpoints return errors.
      await es.indices.updateAliases({
        body: {
          actions: [
            {
              add: {
                index: '.ml-annotations-6-wrong-mapping',
                alias: '.ml-annotations-read',
                is_hidden: true,
              },
            },
            { remove: { index: '.ml-annotations-6', alias: '.ml-annotations-read' } },
            {
              add: {
                index: '.ml-annotations-6-wrong-mapping',
                alias: '.ml-annotations-write',
                is_hidden: true,
              },
            },
            { remove: { index: '.ml-annotations-6', alias: '.ml-annotations-write' } },
          ],
        },
      });
    },

    async restoreAnnotationsIndexState() {
      // restore the original working state of pointing read/write aliases
      // to the right annotations index.
      await es.indices.updateAliases({
        body: {
          actions: [
            { add: { index: '.ml-annotations-6', alias: '.ml-annotations-read', is_hidden: true } },
            { remove: { index: '.ml-annotations-6-wrong-mapping', alias: '.ml-annotations-read' } },
            {
              add: { index: '.ml-annotations-6', alias: '.ml-annotations-write', is_hidden: true },
            },
            {
              remove: { index: '.ml-annotations-6-wrong-mapping', alias: '.ml-annotations-write' },
            },
          ],
        },
      });

      // deletes the temporary annotations index with wrong mappings
      await es.indices.delete({
        index: '.ml-annotations-6-wrong-mapping',
      });
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

    async createMLTestDashboardIfNeeded() {
      await this.createDashboardIfNeeded(dashboards.mlTestDashboard);
    },

    async createDashboardIfNeeded(dashboard: any) {
      const title = dashboard.requestBody.attributes.title;
      const dashboardId = await this.getDashboardId(title);
      if (dashboardId !== undefined) {
        log.debug(`Dashboard with title '${title}' already exists. Nothing to create.`);
        return dashboardId;
      } else {
        return await this.createDashboard(title, dashboard.requestBody);
      }
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

    async deleteSavedObjectById(id: string, objectType: SavedObjectType) {
      log.debug(`Deleting ${objectType} with id '${id}'...`);

      if ((await this.savedObjectExistsById(id, objectType)) === false) {
        log.debug(`${objectType} with id '${id}' does not exists. Nothing to delete.`);
        return;
      } else {
        await supertest
          .delete(`/api/saved_objects/${objectType}/${id}`)
          .set(COMMON_REQUEST_HEADERS)
          .expect(200);

        await this.assertSavedObjectNotExistsById(id, objectType);

        log.debug(` > Deleted ${objectType} with id '${id}'`);
      }
    },

    async deleteIndexPatternByTitle(title: string) {
      log.debug(`Deleting index pattern with title '${title}'...`);

      const indexPatternId = await this.getIndexPatternId(title);
      if (indexPatternId === undefined) {
        log.debug(`Index pattern with title '${title}' does not exists. Nothing to delete.`);
        return;
      } else {
        await this.deleteIndexPatternById(indexPatternId);
      }
    },

    async deleteIndexPatternById(id: string) {
      await this.deleteSavedObjectById(id, SavedObjectType.INDEX_PATTERN);
    },

    async deleteSavedSearchByTitle(title: string) {
      log.debug(`Deleting saved search with title '${title}'...`);

      const savedSearchId = await this.getSavedSearchId(title);
      if (savedSearchId === undefined) {
        log.debug(`Saved search with title '${title}' does not exists. Nothing to delete.`);
        return;
      } else {
        await this.deleteSavedSearchById(savedSearchId);
      }
    },

    async deleteSavedSearchById(id: string) {
      await this.deleteSavedObjectById(id, SavedObjectType.SEARCH);
    },

    async deleteVisualizationByTitle(title: string) {
      log.debug(`Deleting visualization with title '${title}'...`);

      const visualizationId = await this.getVisualizationId(title);
      if (visualizationId === undefined) {
        log.debug(`Visualization with title '${title}' does not exists. Nothing to delete.`);
        return;
      } else {
        await this.deleteVisualizationById(visualizationId);
      }
    },

    async deleteVisualizationById(id: string) {
      await this.deleteSavedObjectById(id, SavedObjectType.VISUALIZATION);
    },

    async deleteDashboardByTitle(title: string) {
      log.debug(`Deleting dashboard with title '${title}'...`);

      const dashboardId = await this.getDashboardId(title);
      if (dashboardId === undefined) {
        log.debug(`Dashboard with title '${title}' does not exists. Nothing to delete.`);
        return;
      } else {
        await this.deleteDashboardById(dashboardId);
      }
    },

    async deleteDashboardById(id: string) {
      await this.deleteSavedObjectById(id, SavedObjectType.DASHBOARD);
    },

    async deleteSavedSearches() {
      for (const search of Object.values(savedSearches)) {
        await this.deleteSavedSearchByTitle(search.requestBody.attributes.title);
      }
    },

    async deleteDashboards() {
      for (const dashboard of Object.values(dashboards)) {
        await this.deleteDashboardByTitle(dashboard.requestBody.attributes.title);
      }
    },

    async assertSavedObjectExistsByTitle(title: string, objectType: SavedObjectType) {
      await retry.waitForWithTimeout(
        `${objectType} with title '${title}' to exist`,
        5 * 1000,
        async () => {
          if ((await this.savedObjectExistsByTitle(title, objectType)) === true) {
            return true;
          } else {
            throw new Error(`${objectType} with title '${title}' should exist.`);
          }
        }
      );
    },

    async assertSavedObjectNotExistsByTitle(title: string, objectType: SavedObjectType) {
      await retry.waitForWithTimeout(
        `${objectType} with title '${title}' not to exist`,
        5 * 1000,
        async () => {
          if ((await this.savedObjectExistsByTitle(title, objectType)) === false) {
            return true;
          } else {
            throw new Error(`${objectType} with title '${title}' should not exist.`);
          }
        }
      );
    },

    async assertSavedObjectExistsById(id: string, objectType: SavedObjectType) {
      await retry.waitForWithTimeout(
        `${objectType} with id '${id}' to exist`,
        5 * 1000,
        async () => {
          if ((await this.savedObjectExistsById(id, objectType)) === true) {
            return true;
          } else {
            throw new Error(`${objectType} with id '${id}' should exist.`);
          }
        }
      );
    },

    async assertSavedObjectNotExistsById(id: string, objectType: SavedObjectType) {
      await retry.waitForWithTimeout(
        `${objectType} with id '${id}' not to exist`,
        5 * 1000,
        async () => {
          if ((await this.savedObjectExistsById(id, objectType)) === false) {
            return true;
          } else {
            throw new Error(`${objectType} with id '${id}' should not exist.`);
          }
        }
      );
    },

    async assertIndexPatternExistByTitle(title: string) {
      await this.assertSavedObjectExistsByTitle(title, SavedObjectType.INDEX_PATTERN);
    },

    async assertIndexPatternExistById(id: string) {
      await this.assertSavedObjectExistsById(id, SavedObjectType.INDEX_PATTERN);
    },

    async assertSavedSearchExistByTitle(title: string) {
      await this.assertSavedObjectExistsByTitle(title, SavedObjectType.SEARCH);
    },

    async assertSavedSearchExistById(id: string) {
      await this.assertSavedObjectExistsById(id, SavedObjectType.SEARCH);
    },

    async assertVisualizationExistByTitle(title: string) {
      await this.assertSavedObjectExistsByTitle(title, SavedObjectType.VISUALIZATION);
    },

    async assertVisualizationExistById(id: string) {
      await this.assertSavedObjectExistsById(id, SavedObjectType.VISUALIZATION);
    },

    async assertDashboardExistByTitle(title: string) {
      await this.assertSavedObjectExistsByTitle(title, SavedObjectType.DASHBOARD);
    },

    async assertDashboardExistById(id: string) {
      await this.assertSavedObjectExistsById(id, SavedObjectType.DASHBOARD);
    },
  };
}
