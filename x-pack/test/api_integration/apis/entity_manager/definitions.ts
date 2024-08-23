/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { entityLatestSchema } from '@kbn/entities-schema';
import {
  entityDefinition as mockDefinition,
  entityDefinitionWithBackfill as mockBackfillDefinition,
} from '@kbn/entityManager-plugin/server/lib/entities/helpers/fixtures';
import { PartialConfig, cleanup, generate } from '@kbn/data-forge';
import { generateLatestIndexName } from '@kbn/entityManager-plugin/server/lib/entities/helpers/generate_component_id';
import { FtrProviderContext } from '../../ftr_provider_context';
import { installDefinition, uninstallDefinition, getInstalledDefinitions } from './helpers/request';
import { waitForDocumentInIndex } from '../../../alerting_api_integration/observability/helpers/alerting_wait_for_helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const logger = getService('log');
  const esClient = getService('es');
  const retryService = getService('retry');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('Entity definitions', () => {
    describe('definitions installations', () => {
      it('can install multiple definitions', async () => {
        await installDefinition(supertest, mockDefinition);
        await installDefinition(supertest, mockBackfillDefinition);

        const { definitions } = await getInstalledDefinitions(supertest);
        expect(definitions.length).to.eql(2);
        expect(
          definitions.find(
            (definition) =>
              definition.id === mockDefinition.id &&
              definition.state.installed === true &&
              definition.state.running === true
          )
        );
        expect(
          definitions.find(
            (definition) =>
              definition.id === mockBackfillDefinition.id &&
              definition.state.installed === true &&
              definition.state.running === true
          )
        );

        await uninstallDefinition(supertest, mockDefinition.id);
        await uninstallDefinition(supertest, mockBackfillDefinition.id);
      });

      it('does not start transforms when specified', async () => {
        await installDefinition(supertest, mockDefinition, { installOnly: true });

        const { definitions } = await getInstalledDefinitions(supertest);
        expect(definitions.length).to.eql(1);
        expect(definitions[0].state.installed).to.eql(true);
        expect(definitions[0].state.running).to.eql(false);

        await uninstallDefinition(supertest, mockDefinition.id);
      });
    });
    describe('entity data', () => {
      let dataForgeConfig: PartialConfig;
      let dataForgeIndices: string[];

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
        await uninstallDefinition(supertest, mockDefinition.id, true);
        await cleanup({ client: esClient, config: dataForgeConfig, logger });
      });

      it('should create the proper entities in the latest index', async () => {
        await installDefinition(supertest, mockDefinition);
        const sample = await waitForDocumentInIndex({
          esClient,
          indexName: generateLatestIndexName(mockDefinition),
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
