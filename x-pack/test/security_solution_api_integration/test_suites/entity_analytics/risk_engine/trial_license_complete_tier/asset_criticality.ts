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
  getAssetCriticalityDoc,
  getAssetCriticalityIndex,
  enableAssetCriticalityAdvancedSetting,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const supertest = getService('supertest');
  const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

  describe('@ess @serverless @skipInQA asset_criticality Asset Criticality APIs', () => {
    beforeEach(async () => {
      await cleanRiskEngine({ kibanaServer, es, log });
      await cleanAssetCriticality({ log, es });
      enableAssetCriticalityAdvancedSetting(kibanaServer, log);
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
            index: getAssetCriticalityIndex(),
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
          index: getAssetCriticalityIndex(),
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
          criticality_level: 'high_impact',
        };

        const { body: result } = await assetCriticalityRoutes.upsert(assetCriticality);

        expect(result.id_field).to.eql('host.name');
        expect(result.id_value).to.eql('host-01');
        expect(result.criticality_level).to.eql('high_impact');
        expect(result['@timestamp']).to.be.a('string');

        const doc = await getAssetCriticalityDoc({ idField: 'host.name', idValue: 'host-01', es });

        expect(doc).to.eql(result);
      });

      it('should return 400 if criticality is invalid', async () => {
        const assetCriticality = {
          id_field: 'host.name',
          id_value: 'host-01',
          criticality_level: 'invalid',
        };

        await assetCriticalityRoutes.upsert(assetCriticality, {
          expectStatusCode: 400,
        });
      });

      it('should return 400 if id_field is invalid', async () => {
        const assetCriticality = {
          id_field: 'invalid',
          id_value: 'host-01',
          criticality_level: 'high_impact',
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
          criticality_level: 'high_impact',
        };

        await assetCriticalityRoutes.upsert(assetCriticality);

        const { body: result } = await assetCriticalityRoutes.get('host.name', 'host-02');

        expect(result.id_field).to.eql('host.name');
        expect(result.id_value).to.eql('host-02');
        expect(result.criticality_level).to.eql('high_impact');
        expect(result['@timestamp']).to.be.a('string');
      });

      it('should return a 400 if id_field is invalid', async () => {
        await assetCriticalityRoutes.get('invalid', 'host-02', {
          expectStatusCode: 400,
        });
      });
    });

    describe('update', () => {
      it('should correctly update asset criticality', async () => {
        const assetCriticality = {
          id_field: 'host.name',
          id_value: 'host-01',
          criticality_level: 'high_impact',
        };

        const { body: createdDoc } = await assetCriticalityRoutes.upsert(assetCriticality);
        const updatedAssetCriticality = {
          id_field: 'host.name',
          id_value: 'host-01',
          criticality_level: 'extreme_impact',
        };

        const { body: updatedDoc } = await assetCriticalityRoutes.upsert(updatedAssetCriticality);

        expect(updatedDoc.id_field).to.eql('host.name');
        expect(updatedDoc.id_value).to.eql('host-01');
        expect(updatedDoc.criticality_level).to.eql('extreme_impact');
        expect(updatedDoc['@timestamp']).to.be.a('string');
        expect(updatedDoc['@timestamp']).to.not.eql(createdDoc['@timestamp']);

        const doc = await getAssetCriticalityDoc({ idField: 'host.name', idValue: 'host-01', es });

        expect(doc).to.eql(updatedDoc);
      });
    });

    describe('delete', () => {
      it('should correctly delete asset criticality', async () => {
        const assetCriticality = {
          id_field: 'host.name',
          id_value: 'delete-me',
          criticality_level: 'high_impact',
        };

        await assetCriticalityRoutes.upsert(assetCriticality);

        await assetCriticalityRoutes.delete('host.name', 'delete-me');
        const doc = await getAssetCriticalityDoc({
          idField: 'host.name',
          idValue: 'delete-me',
          es,
        });

        expect(doc).to.eql(undefined);
      });
    });
  });
};
