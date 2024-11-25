/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  assetCriticalityRouteHelpersFactory,
  cleanAssetCriticality,
  getAssetCriticalityDoc,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';
export default ({ getService }: FtrProviderContext) => {
  describe('@ess @serverless @serverlessQA Entity Analytics - Asset Criticality CSV upload', () => {
    const esClient = getService('es');
    const supertest = getService('supertest');
    const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);
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
      expect(esDoc).toEqual(expect.objectContaining(expectedDoc));
    };

    before(async () => {
      await cleanAssetCriticality({ es: esClient, namespace: 'default', log });
    });

    after(async () => {
      await cleanAssetCriticality({ es: esClient, namespace: 'default', log });
    });

    describe('Asset Criticality privileges API', () => {
      it('should correctly upload a valid csv with one entity', async () => {
        const validCsv = 'host,host-1,low_impact';
        const { body } = await assetCriticalityRoutes.uploadCsv(validCsv);
        expect(body.errors).toEqual([]);
        expect(body.stats).toEqual({
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
        expect(body.errors).toEqual([]);
        expect(body.stats).toEqual({
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

      expect(body.stats).toEqual({
        total: 8,
        successful: 0,
        failed: 8,
      });

      expect(body.errors).toEqual([
        {
          index: 1,
          message:
            'Invalid criticality level "invalid_criticality", expected one of extreme_impact, high_impact, medium_impact, low_impact',
        },
        {
          index: 2,
          message: 'Invalid entity type "invalid_entity", expected host or user',
        },
        {
          index: 3,
          message: 'Missing identifier',
        },
        {
          index: 4,
          message: 'Missing criticality level',
        },
        {
          index: 5,
          message: 'Missing entity type',
        },
        {
          index: 6,
          message: 'Expected 3 columns, got 2',
        },
        {
          index: 7,
          message: 'Expected 3 columns, got 4',
        },
        {
          index: 8,
          message: `Identifier is too long, expected less than 1000 characters, got 1001`,
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

      expect(body.stats).toEqual({
        total: 3,
        successful: 2,
        failed: 1,
      });

      expect(body.errors).toEqual([
        {
          index: 2,
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
      expect(body.stats).toEqual({
        total: 0,
        successful: 0,
        failed: 0,
      });
    });
  });
};
