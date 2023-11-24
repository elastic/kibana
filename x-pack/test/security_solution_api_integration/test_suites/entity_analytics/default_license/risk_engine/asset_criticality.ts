/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  cleanRiskEngine,
  cleanAssetCriticality,
  assetCriticalityRouteHelpersFactory,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';
const assetCriticalityIndex = '.asset-criticality.asset-criticality-default';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const supertest = getService('supertest');
  const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

  const getAssetCriticalityDoc = async (idField: string, idValue: string) => {
    try {
      const doc = await es.get({
        index: assetCriticalityIndex,
        id: `${idField}:${idValue}`,
      });

      return doc._source;
    } catch (e) {
      return undefined;
    }
  };

  describe('@ess @serverless @skipInQA asset_criticality Asset Criticality APIs', () => {
    beforeEach(async () => {
      await cleanRiskEngine({ kibanaServer, es, log });
      await cleanAssetCriticality({ log, es });
    });

    afterEach(async () => {
      await cleanRiskEngine({ kibanaServer, es, log });
      await cleanAssetCriticality({ log, es });
    });

    describe('initialisation of resources', () => {
      it('should has index installed on status api call', async () => {
        let assetCriticalityIndexExist;

        try {
          assetCriticalityIndexExist = await es.indices.exists({
            index: assetCriticalityIndex,
          });
        } catch (e) {
          assetCriticalityIndexExist = false;
        }

        expect(assetCriticalityIndexExist).to.eql(false);

        const statusResponse = await assetCriticalityRoutes.status();

        expect(statusResponse.body).to.eql({
          asset_criticality_resources_installed: true,
        });

        const assetCriticalityIndexResult = await es.indices.get({
          index: assetCriticalityIndex,
        });

        expect(
          assetCriticalityIndexResult['.asset-criticality.asset-criticality-default']?.mappings
        ).to.eql({
          dynamic: 'strict',
          properties: {
            '@timestamp': {
              type: 'date',
            },
            criticality_level: {
              type: 'keyword',
            },
            id_field: {
              type: 'keyword',
            },
            id_value: {
              type: 'keyword',
            },
            updated_at: {
              type: 'date',
            },
          },
        });
      });
    });

    describe('create', () => {
      it('should correctly create asset criticality', async () => {
        const assetCriticality = {
          id_field: 'host.name',
          id_value: 'host-01',
          criticality: 'important',
        };

        const { body: result } = await assetCriticalityRoutes.upsert(assetCriticality);

        expect(result.id_field).to.eql('host.name');
        expect(result.id_value).to.eql('host-01');
        expect(result.criticality).to.eql('important');
        expect(result['@timestamp']).to.be.a('string');

        const doc = await getAssetCriticalityDoc('host.name', 'host-01');

        expect(doc).to.eql(result);
      });

      it('should return 400 if criticality is invalid', async () => {
        const assetCriticality = {
          id_field: 'host.name',
          id_value: 'host-01',
          criticality: 'invalid',
        };

        await assetCriticalityRoutes.upsert(assetCriticality, {
          expectStatusCode: 400,
        });
      });
    });

    describe('read', () => {
      it('should correctly get asset criticality', async () => {
        const assetCriticality = {
          id_field: 'host.name',
          id_value: 'host-02',
          criticality: 'important',
        };

        await assetCriticalityRoutes.upsert(assetCriticality);

        const { body: result } = await assetCriticalityRoutes.get('host.name', 'host-02');

        expect(result.id_field).to.eql('host.name');
        expect(result.id_value).to.eql('host-02');
        expect(result.criticality).to.eql('important');
        expect(result['@timestamp']).to.be.a('string');
      });
    });

    describe('update', () => {
      it('should correctly update asset criticality', async () => {
        const assetCriticality = {
          id_field: 'host.name',
          id_value: 'host-01',
          criticality: 'important',
        };

        await assetCriticalityRoutes.upsert(assetCriticality);

        const updatedAssetCriticality = {
          id_field: 'host.name',
          id_value: 'host-01',
          criticality: 'very_important',
        };

        const { body: result } = await assetCriticalityRoutes.upsert(updatedAssetCriticality);

        expect(result.id_field).to.eql('host.name');
        expect(result.id_value).to.eql('host-01');
        expect(result.criticality).to.eql('very_important');
        expect(result['@timestamp']).to.be.a('string');

        const doc = await getAssetCriticalityDoc('host.name', 'host-01');

        expect(doc).to.eql(result);
      });
    });

    describe('delete', () => {
      it('should correctly delete asset criticality', async () => {
        const assetCriticality = {
          id_field: 'host.name',
          id_value: 'delete-me',
          criticality: 'important',
        };

        await assetCriticalityRoutes.upsert(assetCriticality);

        await assetCriticalityRoutes.delete('host.name', 'delete-me');
        const doc = await getAssetCriticalityDoc('host.name', 'delete-me');

        expect(doc).to.eql(undefined);
      });
    });
  });
};
