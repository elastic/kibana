/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import omit from 'lodash/omit';
import {
  assetCriticalityRouteHelpersFactory,
  cleanAssetCriticality,
  disableAssetCriticalityAdvancedSetting,
  enableAssetCriticalityAdvancedSetting,
  getAssetCriticalityDoc,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';
export default ({ getService }: FtrProviderContext) => {
  describe('@ess @serverless Entity Analytics - Asset Criticality CSV upload', () => {
    const esClient = getService('es');
    const supertest = getService('supertest');
    const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);
    const kibanaServer = getService('kibanaServer');
    const log = getService('log');
    const expectAssetCriticalityDocMatching = async (expectedDoc: {
      id_field: string;
      id_value: string;
      criticality_level: string;
    }) => {
      const esDoc = await getAssetCriticalityDoc({
        es: esClient,
        idField: expectedDoc.id_field,
        idValue: expectedDoc.id_value,
      });

      expect(omit(esDoc, '@timestamp')).to.eql(expectedDoc);
    };

    before(async () => {
      await cleanAssetCriticality({ es: esClient, namespace: 'default', log });
    });

    beforeEach(async () => {
      await enableAssetCriticalityAdvancedSetting(kibanaServer, log);
    });

    after(async () => {
      await cleanAssetCriticality({ es: esClient, namespace: 'default', log });
    });

    describe('Asset Criticality privileges API', () => {
      it('should correctly upload a valid csv with one entity', async () => {
        const validCsv = 'host,host-1,low_impact';
        const { body } = await assetCriticalityRoutes.uploadCsv(validCsv);
        expect(body.errors).to.eql([]);
        expect(body.stats).to.eql({
          total: 1,
          successful: 1,
          failed: 0,
        });

        await expectAssetCriticalityDocMatching({
          id_field: 'host.name',
          id_value: 'host-1',
          criticality_level: 'low_impact',
        });
      });

      it('should return updated if the entity already had a criticality record', async () => {
        await assetCriticalityRoutes.upsert({
          id_field: 'host.name',
          id_value: 'update-host-1',
          criticality_level: 'high_impact',
        });

        const validCsv = 'host,update-host-1,low_impact';
        const { body } = await assetCriticalityRoutes.uploadCsv(validCsv);
        expect(body.errors).to.eql([]);
        expect(body.stats).to.eql({
          total: 1,
          successful: 1,
          failed: 0,
        });

        await expectAssetCriticalityDocMatching({
          id_field: 'host.name',
          id_value: 'update-host-1',
          criticality_level: 'low_impact',
        });
      });
    });

    it('should handle all errors in the csv', async () => {
      const invalidRows = [
        'host,host-1,invalid_criticality', // invalid criticality
        'invalid_entity,host-1,low_impact', // invalid entity
        'host,,low_impact', // missing id
        'host,host-1,', // missing criticality
        ',host-1,low_impact', // missing entity type
        'host,host-1', // missing column
        'host,host-1,low_impact,extra_column', // extra column
        `host,${'a'.repeat(1001)},low_impact`, // id too long
      ];

      const { body } = await assetCriticalityRoutes.uploadCsv(invalidRows.join('\n'));

      expect(body.stats).to.eql({
        total: 8,
        successful: 0,
        failed: 8,
      });

      expect(body.errors).to.eql([
        {
          index: 0,
          message:
            'Invalid criticality level "invalid_criticality", expected one of extreme_impact, high_impact, medium_impact, low_impact',
        },
        {
          index: 1,
          message: 'Invalid entity type "invalid_entity", expected host or user',
        },
        {
          index: 2,
          message: 'Missing ID',
        },
        {
          index: 3,
          message: 'Missing criticality level',
        },
        {
          index: 4,
          message: 'Missing entity type',
        },
        {
          index: 5,
          message: 'Expected 3 columns, got 2',
        },
        {
          index: 6,
          message: 'Expected 3 columns, got 4',
        },
        {
          index: 7,
          message: `ID is too long, expected less than 1000 characters, got 1001`,
        },
      ]);
    });

    it('should upload valid lines if there are invalid lines', async () => {
      const lines = [
        'host,mix-test-host-1,low_impact',
        'host,mix-test-host-2,invalid_criticality',
        'host,mix-test-host-3,high_impact',
      ];

      const { body } = await assetCriticalityRoutes.uploadCsv(lines.join('\n'));

      expect(body.stats).to.eql({
        total: 3,
        successful: 2,
        failed: 1,
      });

      expect(body.errors).to.eql([
        {
          index: 1,
          message:
            'Invalid criticality level "invalid_criticality", expected one of extreme_impact, high_impact, medium_impact, low_impact',
        },
      ]);

      await expectAssetCriticalityDocMatching({
        id_field: 'host.name',
        id_value: 'mix-test-host-1',
        criticality_level: 'low_impact',
      });

      await expectAssetCriticalityDocMatching({
        id_field: 'host.name',
        id_value: 'mix-test-host-3',
        criticality_level: 'high_impact',
      });
    });

    it('should return 200 if the csv is empty', async () => {
      const { body } = await assetCriticalityRoutes.uploadCsv('');
      expect(body.stats).to.eql({
        total: 0,
        successful: 0,
        failed: 0,
      });
    });

    it('should return 403 if the advanced setting is disabled', async () => {
      await disableAssetCriticalityAdvancedSetting(kibanaServer, log);

      await assetCriticalityRoutes.uploadCsv('host,host-1,low_impact', {
        expectStatusCode: 403,
      });
    });
  });
};
