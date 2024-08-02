/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import { AssetCriticalityRecord } from '@kbn/security-solution-plugin/common/api/entity_analytics';
import _ from 'lodash';
import { CreateAssetCriticalityRecord } from '@kbn/security-solution-plugin/common/api/entity_analytics';
import {
  cleanRiskEngine,
  cleanAssetCriticality,
  assetCriticalityRouteHelpersFactory,
  getAssetCriticalityDoc,
  getAssetCriticalityIndex,
  enableAssetCriticalityAdvancedSetting,
  disableAssetCriticalityAdvancedSetting,
  createAssetCriticalityRecords,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const supertest = getService('supertest');
  const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

  describe('@ess @serverless @skipInServerlessMKI asset_criticality Asset Criticality APIs', () => {
    beforeEach(async () => {
      await cleanRiskEngine({ kibanaServer, es, log });
      await cleanAssetCriticality({ log, es });
      await enableAssetCriticalityAdvancedSetting(kibanaServer, log);
    });

    afterEach(async () => {
      await cleanRiskEngine({ kibanaServer, es, log });
      await cleanAssetCriticality({ log, es });
    });

    describe('initialisation of resources', () => {
      it('should have index installed on status api call', async () => {
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

      it('should return 403 if the advanced setting is disabled', async () => {
        await disableAssetCriticalityAdvancedSetting(kibanaServer, log);

        const validAssetCriticality = {
          id_field: 'host.name',
          id_value: 'host-01',
          criticality_level: 'high_impact',
        };

        await assetCriticalityRoutes.upsert(validAssetCriticality, {
          expectStatusCode: 403,
        });
      });
    });

    describe('get', () => {
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

      it('should return 403 if the advanced setting is disabled', async () => {
        await disableAssetCriticalityAdvancedSetting(kibanaServer, log);

        await assetCriticalityRoutes.get('host.name', 'doesnt-matter', {
          expectStatusCode: 403,
        });
      });
    });

    describe('list', () => {
      const TEST_DATA_LENGTH = 40;
      const LEVELS = ['low_impact', 'medium_impact', 'high_impact', 'extreme_impact'] as const;
      const startTime = Date.now() - 1000 * TEST_DATA_LENGTH;
      const records: AssetCriticalityRecord[] = Array.from(
        { length: TEST_DATA_LENGTH },
        (__, i) => ({
          id_field: 'host.name',
          id_value: `host-${i}`,
          criticality_level: LEVELS[Math.floor(i / 10)],
          '@timestamp': new Date(startTime + i * 1000).toISOString(),
        })
      );

      const createRecords = () => createAssetCriticalityRecords(records, es);

      before(async () => {
        enableAssetCriticalityAdvancedSetting(kibanaServer, log);
      });

      it('@skipInServerless should return the first 10 asset criticality records if no args provided', async () => {
        await createRecords();

        const { body } = await assetCriticalityRoutes.list();

        expect(omit(body, 'records')).to.eql({
          total: TEST_DATA_LENGTH,
          page: 1,
          per_page: 10,
        });

        expect(body.records.map((record: AssetCriticalityRecord) => record.id_value)).to.eql(
          records.slice(0, 10).map((record) => record.id_value)
        );
      });

      it('should return the last 10 asset criticality records if sorting by timestamp desc', async () => {
        await createRecords();

        const { body } = await assetCriticalityRoutes.list({
          sort_field: '@timestamp',
          sort_direction: 'desc',
        });

        expect(omit(body, 'records')).to.eql({
          total: TEST_DATA_LENGTH,
          page: 1,
          per_page: 10,
        });

        expect(body.records.map((record: AssetCriticalityRecord) => record.id_value)).to.eql(
          _.reverse(records.slice(-10)).map((record) => record.id_value)
        );
      });

      it('@skipInServerless should only return 1 asset criticality record if per_page=1', async () => {
        await createRecords();

        const { body } = await assetCriticalityRoutes.list({ per_page: 1 });

        expect(omit(body, 'records')).to.eql({
          total: TEST_DATA_LENGTH,
          page: 1,
          per_page: 1,
        });

        expect(body.records[0].id_value).to.eql(records[0].id_value);
      });

      it('@skipInServerless should return the next 10 asset criticality records if page=2', async () => {
        await createRecords();

        const { body } = await assetCriticalityRoutes.list({ page: 2 });

        expect(omit(body, 'records')).to.eql({
          total: TEST_DATA_LENGTH,
          page: 2,
          per_page: 10,
        });

        expect(body.records.map((record: AssetCriticalityRecord) => record.id_value)).to.eql(
          records.slice(10, 20).map((record) => record.id_value)
        );
      });

      it('should return 20 records if filtering by criticality_level low_impact and medium_impact', async () => {
        await createRecords();

        const { body } = await assetCriticalityRoutes.list({
          kuery: 'criticality_level:low_impact OR criticality_level:medium_impact',
        });

        expect(omit(body, 'records')).to.eql({
          total: 20,
          page: 1,
          per_page: 10,
        });
      });

      it('should return all records if filtering by id_field = host.name', async () => {
        await createRecords();

        const { body } = await assetCriticalityRoutes.list({
          kuery: 'id_field:host.name',
        });

        expect(omit(body, 'records')).to.eql({
          total: TEST_DATA_LENGTH,
          page: 1,
          per_page: 10,
        });
      });

      it('should return a 400 if page is 0', async () => {
        await assetCriticalityRoutes.list({ page: 0 }, { expectStatusCode: 400 });
      });

      it('should return a 400 if per_page is 0', async () => {
        await assetCriticalityRoutes.list({ per_page: 0 }, { expectStatusCode: 400 });
      });

      it('should return a 400 if per_page is greater than 10000', async () => {
        await assetCriticalityRoutes.list({ per_page: 10001 }, { expectStatusCode: 400 });
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

    describe('bulk upload', () => {
      const expectAssetCriticalityDocMatching = async (expectedDoc: {
        id_field: string;
        id_value: string;
        criticality_level: string;
      }) => {
        const esDoc = await getAssetCriticalityDoc({
          es,
          idField: expectedDoc.id_field,
          idValue: expectedDoc.id_value,
        });

        expect(omit(esDoc, '@timestamp')).to.eql(expectedDoc);
      };

      it('should return 400 if the records array is empty', async () => {
        await assetCriticalityRoutes.bulkUpload([], {
          expectStatusCode: 400,
        });
      });

      it('should return 400 if the records array is too large', async () => {
        const records = new Array(1001).fill({
          id_field: 'host.name',
          id_value: 'host-1',
          criticality_level: 'high_impact',
        });

        await assetCriticalityRoutes.bulkUpload(records, {
          expectStatusCode: 400,
        });
      });

      it('should return a 403 if the advanced setting is disabled', async () => {
        await disableAssetCriticalityAdvancedSetting(kibanaServer, log);

        const validRecord: CreateAssetCriticalityRecord = {
          id_field: 'host.name',
          id_value: 'delete-me',
          criticality_level: 'high_impact',
        };

        await assetCriticalityRoutes.bulkUpload([validRecord], {
          expectStatusCode: 403,
        });
      });

      it('should correctly upload a valid record for one entity', async () => {
        const validRecord: CreateAssetCriticalityRecord = {
          id_field: 'host.name',
          id_value: 'host-1',
          criticality_level: 'high_impact',
        };
        const { body } = await assetCriticalityRoutes.bulkUpload([validRecord]);
        expect(body.errors).to.eql([]);
        expect(body.stats).to.eql({
          total: 1,
          successful: 1,
          failed: 0,
        });

        await expectAssetCriticalityDocMatching(validRecord);
      });

      it('should correctly upload valid records for multiple entities', async () => {
        const validRecords: CreateAssetCriticalityRecord[] = Array.from(
          { length: 50 },
          (__, i) => ({
            id_field: 'host.name',
            id_value: `host-${i}`,
            criticality_level: 'high_impact',
          })
        );

        const { body } = await assetCriticalityRoutes.bulkUpload(validRecords);
        expect(body.errors).to.eql([]);
        expect(body.stats).to.eql({
          total: validRecords.length,
          successful: validRecords.length,
          failed: 0,
        });

        await Promise.all(validRecords.map(expectAssetCriticalityDocMatching));
      });

      it('should return a 400 if a record is invalid', async () => {
        const invalidRecord = {
          id_field: 'host.name',
          id_value: 'host-1',
          criticality_level: 'invalid',
        } as unknown as CreateAssetCriticalityRecord;

        const validRecord: CreateAssetCriticalityRecord = {
          id_field: 'host.name',
          id_value: 'host-2',
          criticality_level: 'high_impact',
        };

        await assetCriticalityRoutes.bulkUpload([invalidRecord, validRecord], {
          expectStatusCode: 400,
        });
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

      it('should return 403 if the advanced setting is disabled', async () => {
        await disableAssetCriticalityAdvancedSetting(kibanaServer, log);

        await assetCriticalityRoutes.delete('host.name', 'doesnt-matter', {
          expectStatusCode: 403,
        });
      });
    });
  });
};
