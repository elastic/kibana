/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import expect from '@kbn/expect';
import { entityLatestSchema } from '@kbn/entities-schema';
import {
  entityDefinition,
  entityDefinitionWithBackfill as mockBackfillDefinition,
} from '@kbn/entityManager-plugin/server/lib/entities/helpers/fixtures';
import { PartialConfig, cleanup, generate } from '@kbn/data-forge';
import { generateLatestIndexName } from '@kbn/entityManager-plugin/server/lib/entities/helpers/generate_component_id';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  installDefinition,
  uninstallDefinition,
  updateDefinition,
  getInstalledDefinitions,
} from './helpers/request';
import { waitForDocumentInIndex } from '../../../alerting_api_integration/observability/helpers/alerting_wait_for_helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const logger = getService('log');
  const esClient = getService('es');
  const dataViewApi = getService('dataViewApi');
  const retryService = getService('retry');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const mockEntityDefinition = (overwrites: object = {}) => ({
    ...entityDefinition,
    id: `entity-${Date.now()}`,
    ...overwrites,
  });

  const dataViewId = 'TEST_DATA_VIEW_ID';
  const dataviewPattern = 'TEST_DATE_VIEW*';

  describe('Entity definitions', () => {
    before(async () => {
      await dataViewApi.create({
        name: dataviewPattern,
        id: dataViewId,
        title: dataviewPattern,
      });
    });

    after(async () => {
      await dataViewApi.delete({ id: dataViewId });
    });

    afterEach(async () => {
      const { definitions } = await getInstalledDefinitions(supertest);
      await Promise.all(
        definitions.map(({ id }) => uninstallDefinition(supertest, { id, deleteData: true }))
      );
    });

    describe('definitions installations', () => {
      it('can install multiple definitions', async () => {
        const mockedDefinition = mockEntityDefinition();
        await installDefinition(supertest, { definition: mockedDefinition });
        await installDefinition(supertest, { definition: mockBackfillDefinition });

        const { definitions } = await getInstalledDefinitions(supertest);
        expect(definitions.length).to.eql(2);
        expect(
          definitions.some(
            (definition) =>
              definition.id === mockedDefinition.id &&
              definition.state.installed === true &&
              definition.state.running === true
          )
        ).to.eql(true);
        expect(
          definitions.some(
            (definition) =>
              definition.id === mockBackfillDefinition.id &&
              definition.state.installed === true &&
              definition.state.running === true
          )
        ).to.eql(true);
      });

      it('does not start transforms when specified', async () => {
        const mockedDefinition = mockEntityDefinition();
        await installDefinition(supertest, { definition: mockedDefinition, installOnly: true });

        const { definitions } = await getInstalledDefinitions(supertest);
        expect(definitions.length).to.eql(1);
        expect(definitions[0].state.installed).to.eql(true);
        expect(definitions[0].state.running).to.eql(false);
      });

      it('can install definitions with dataViewId', async () => {
        const mockedDefinition = mockEntityDefinition({ indexPatterns: undefined, dataViewId });

        const { body } = await installDefinition(supertest, {
          definition: mockedDefinition,
        });

        expect(body.dataViewId).to.eql(dataViewId);
      });
    });

    describe('definitions update', () => {
      it('returns 404 if the definitions does not exist', async () => {
        await updateDefinition(supertest, {
          id: 'i-dont-exist',
          update: { version: '1.0.0' },
          expectedCode: 404,
        });
      });

      it('accepts partial updates', async () => {
        const mockedDefinition = mockEntityDefinition();
        const incVersion = semver.inc(mockedDefinition.version, 'major');
        await installDefinition(supertest, { definition: mockedDefinition, installOnly: true });
        await updateDefinition(supertest, {
          id: mockedDefinition.id,
          update: {
            version: incVersion!,
            history: {
              timestampField: '@updatedTimestampField',
            },
          },
        });

        const {
          definitions: [updatedDefinition],
        } = await getInstalledDefinitions(supertest);
        expect(updatedDefinition.version).to.eql(incVersion);
        expect(updatedDefinition.history.timestampField).to.eql('@updatedTimestampField');
      });

      it('rejects updates to managed definitions', async () => {
        const mockedDefinition = mockEntityDefinition({ managed: true });

        await installDefinition(supertest, {
          definition: mockedDefinition,
          installOnly: true,
        });

        await updateDefinition(supertest, {
          id: mockedDefinition.id,
          update: {
            version: '1.0.0',
            history: {
              timestampField: '@updatedTimestampField',
            },
          },
          expectedCode: 403,
        });
      });

      it('deletes the indexPattern when setting dataview', async () => {
        const mockedDefinition = mockEntityDefinition({
          indexPatterns: ['indexPattern'],
          installOnly: true,
        });

        await installDefinition(supertest, { definition: mockedDefinition, installOnly: true });
        const { body } = await updateDefinition(supertest, {
          id: mockedDefinition.id,
          update: {
            version: '2.0.0',
            dataViewId,
          },
        });

        expect(body.indexPattern).to.be(undefined);
        expect(body.dataViewId).to.eql(dataViewId);
      });
    });

    describe('entity data', () => {
      let dataForgeConfig: PartialConfig;
      let dataForgeIndices: string[];
      const mockedDefinition = mockEntityDefinition();

      before(async () => {
        dataForgeConfig = {
          indexing: {
            dataset: 'fake_stack',
            eventsPerCycle: 100,
            interval: 60_000,
          },
          schedule: [
            {
              template: 'good',
              start: 'now-15m',
              end: 'now+5m',
            },
          ],
        };
        dataForgeIndices = await generate({ client: esClient, config: dataForgeConfig, logger });
        await waitForDocumentInIndex({
          esClient,
          indexName: 'kbn-data-forge-fake_stack.admin-console-*',
          docCountTarget: 2020,
          retryService,
          logger,
        });
      });

      after(async () => {
        await esDeleteAllIndices(dataForgeIndices);
        await uninstallDefinition(supertest, { id: mockedDefinition.id, deleteData: true });
        await cleanup({ client: esClient, config: dataForgeConfig, logger });
      });

      it('should create the proper entities in the latest index', async () => {
        await installDefinition(supertest, { definition: mockedDefinition });
        const sample = await waitForDocumentInIndex({
          esClient,
          indexName: generateLatestIndexName(mockedDefinition),
          docCountTarget: 5,
          retryService,
          logger,
        });

        const parsedSample = entityLatestSchema.safeParse(sample.hits.hits[0]._source);
        expect(parsedSample.success).to.be(true);
      });
    });
  });
}
