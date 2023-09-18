/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';

import { Asset, AssetWithoutTimestamp } from '@kbn/assetManager-plugin/common/types_api';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { createSampleAssets, deleteSampleAssets, viewSampleAssetDocs } from '../helpers';
import { ASSETS_ENDPOINT } from '../constants';

const RELATED_ASSETS_ENDPOINT = `${ASSETS_ENDPOINT}/related`;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('asset management', () => {
    let sampleAssetDocs: AssetWithoutTimestamp[] = [];
    let relatedAssetBaseQuery = {};

    before(async () => {
      sampleAssetDocs = await viewSampleAssetDocs(supertest);
      relatedAssetBaseQuery = {
        size: sampleAssetDocs.length,
        from: 'now-1d',
        maxDistance: 5,
      };
    });

    beforeEach(async () => {
      await deleteSampleAssets(supertest);
    });

    describe('GET /assets/related', () => {
      describe('basic validation of all relations', () => {
        const relations = [
          {
            name: 'ancestors',
            ean: 'host:node-101',
            expectedRelatedEans: ['cluster:cluster-001'],
          },
          {
            name: 'descendants',
            ean: 'cluster:cluster-001',
            expectedRelatedEans: ['host:node-101', 'host:node-102', 'host:node-103'],
          },
          {
            name: 'references',
            ean: 'pod:pod-200xrg1',
            expectedRelatedEans: ['cluster:cluster-001'],
          },
        ];

        relations.forEach((relation) => {
          it(`should return the ${relation.name} assets`, async () => {
            await createSampleAssets(supertest);

            const getResponse = await supertest
              .get(RELATED_ASSETS_ENDPOINT)
              .query({
                relation: relation.name,
                size: sampleAssetDocs.length,
                from: 'now-1d',
                ean: relation.ean,
                maxDistance: 1,
              })
              .expect(200);

            const relatedEans = getResponse.body.results[relation.name].map(
              (asset: Asset) => asset['asset.ean']
            );
            expect(relatedEans).to.eql(relation.expectedRelatedEans);
          });
        });
      });

      describe('response validation', () => {
        it('should return 404 if primary asset not found', async () => {
          await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              ...relatedAssetBaseQuery,
              relation: 'descendants',
              ean: 'non-existing-ean',
            })
            .expect(404);
        });

        it('should return the primary asset', async () => {
          await createSampleAssets(supertest);

          const sampleCluster = sampleAssetDocs.find(
            (asset) => asset['asset.id'] === 'cluster-002'
          );

          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              ...relatedAssetBaseQuery,
              relation: 'descendants',
              ean: sampleCluster!['asset.ean'],
            })
            .expect(200);

          const {
            body: { results },
          } = getResponse;
          delete results.primary['@timestamp'];
          expect(results.primary).to.eql(sampleCluster);
        });

        it('should return empty assets when none matching', async () => {
          await createSampleAssets(supertest);

          const sampleCluster = sampleAssetDocs.find(
            (asset) => asset['asset.id'] === 'cluster-002'
          );

          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              ...relatedAssetBaseQuery,
              relation: 'descendants',
              ean: sampleCluster!['asset.ean'],
            })
            .expect(200);

          const {
            body: { results },
          } = getResponse;

          expect(results).to.have.property('descendants');
          expect(results.descendants).to.have.length(0);
        });

        it('breaks circular dependency', async () => {
          await createSampleAssets(supertest);

          // pods reference a node that references the pods
          const sampleNode = sampleAssetDocs.find((asset) => asset['asset.id'] === 'pod-203ugg5');

          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              ...relatedAssetBaseQuery,
              relation: 'references',
              ean: sampleNode!['asset.ean'],
            })
            .expect(200);

          const {
            body: { results },
          } = getResponse;
          expect(
            results.references.map((asset: Asset) => pick(asset, ['asset.ean', 'distance']))
          ).to.eql([
            { 'asset.ean': 'host:node-203', distance: 1 },
            { 'asset.ean': 'pod:pod-203ugg9', distance: 2 },
          ]);
        });

        it('should reject requests with negative size parameter', async () => {
          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              ...relatedAssetBaseQuery,
              relation: 'descendants',
              ean: 'non-existing-ean',
              size: -1,
            })
            .expect(400);

          expect(getResponse.body.message).to.equal(
            '[request query]: Failed to validate: \n  in /0/size: -1 does not match expected type pipe(ToNumber, InRange)\n  in /0/size: "-1" does not match expected type pipe(undefined, BooleanFromString)'
          );
        });

        it('should reject requests with size parameter greater than 100', async () => {
          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              ...relatedAssetBaseQuery,
              relation: 'descendants',
              ean: 'non-existing-ean',
              size: 101,
            })
            .expect(400);

          expect(getResponse.body.message).to.equal(
            '[request query]: Failed to validate: \n  in /0/size: 101 does not match expected type pipe(ToNumber, InRange)\n  in /0/size: "101" does not match expected type pipe(undefined, BooleanFromString)'
          );
        });

        it('should reject requests with negative maxDistance parameter', async () => {
          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              ...relatedAssetBaseQuery,
              relation: 'descendants',
              ean: 'non-existing-ean',
              maxDistance: -1,
            })
            .expect(400);

          expect(getResponse.body.message).to.equal(
            '[request query]: Failed to validate: \n  in /0/maxDistance: -1 does not match expected type pipe(ToNumber, InRange)\n  in /0/maxDistance: "-1" does not match expected type pipe(undefined, BooleanFromString)'
          );
        });

        it('should reject requests with size parameter maxDistance is greater than 5', async () => {
          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              ...relatedAssetBaseQuery,
              relation: 'descendants',
              ean: 'non-existing-ean',
              maxDistance: 6,
            })
            .expect(400);

          expect(getResponse.body.message).to.equal(
            '[request query]: Failed to validate: \n  in /0/maxDistance: 6 does not match expected type pipe(ToNumber, InRange)\n  in /0/maxDistance: "6" does not match expected type pipe(undefined, BooleanFromString)'
          );
        });

        it('should reject requests with invalid from and to parameters', async () => {
          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              ...relatedAssetBaseQuery,
              relation: 'descendants',
              ean: 'non-existing-ean',
              from: 'now_1p',
              to: 'now_1p',
            })
            .expect(400);

          expect(getResponse.body.message).to.equal(
            '[request query]: Failed to validate: \n  in /0/from: "now_1p" does not match expected type Date\n  in /0/from: "now_1p" does not match expected type datemath\n  in /1/to: "now_1p" does not match expected type Date\n  in /1/to: "now_1p" does not match expected type datemath'
          );
        });

        it('should reject requests where time range is moving backwards in time', async () => {
          const now = new Date();
          const isoNow = now.toISOString();
          const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 60 * 1).toISOString();

          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              ...relatedAssetBaseQuery,
              relation: 'descendants',
              from: isoNow,
              to: oneHourAgo,
              maxDistance: 1,
              ean: 'non-existing-ean',
            })
            .expect(400);
          expect(getResponse.body.message).to.equal(
            `Time range cannot move backwards in time. "to" (${oneHourAgo}) is before "from" (${isoNow}).`
          );
        });
      });

      describe('no asset.type filters', () => {
        it('should return all descendants of a provided ean at maxDistance 1', async () => {
          await createSampleAssets(supertest);

          const sampleCluster = sampleAssetDocs.find(
            (asset) => asset['asset.id'] === 'cluster-001'
          );

          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              relation: 'descendants',
              size: sampleAssetDocs.length,
              from: 'now-1d',
              ean: sampleCluster!['asset.ean'],
              maxDistance: 1,
            })
            .expect(200);

          const {
            body: { results },
          } = getResponse;
          expect(results.descendants).to.have.length(3);
          expect(results.descendants.every((asset: { distance: number }) => asset.distance === 1));
        });

        it('should return all descendants of a provided ean at maxDistance 2', async () => {
          await createSampleAssets(supertest);

          const sampleCluster = sampleAssetDocs.find(
            (asset) => asset['asset.id'] === 'cluster-001'
          );

          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              relation: 'descendants',
              size: sampleAssetDocs.length,
              from: 'now-1d',
              ean: sampleCluster!['asset.ean'],
              maxDistance: 2,
            })
            .expect(200);

          const {
            body: { results },
          } = getResponse;
          expect(results.descendants).to.have.length(12);
        });
      });

      describe('with asset.kind filters', () => {
        it('should filter by the provided asset kind', async () => {
          await createSampleAssets(supertest);

          const sampleCluster = sampleAssetDocs.find(
            (asset) => asset['asset.id'] === 'cluster-001'
          );

          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              relation: 'descendants',
              size: sampleAssetDocs.length,
              from: 'now-1d',
              ean: sampleCluster!['asset.ean'],
              maxDistance: 1,
              kind: ['pod'],
            })
            .expect(200);

          const {
            body: { results },
          } = getResponse;
          expect(results.descendants).to.have.length(0);
        });

        it('should return all descendants of a provided ean at maxDistance 2', async () => {
          await createSampleAssets(supertest);

          const sampleCluster = sampleAssetDocs.find(
            (asset) => asset['asset.id'] === 'cluster-001'
          );

          const getResponse = await supertest
            .get(RELATED_ASSETS_ENDPOINT)
            .query({
              relation: 'descendants',
              size: sampleAssetDocs.length,
              from: 'now-1d',
              ean: sampleCluster!['asset.ean'],
              maxDistance: 2,
              kind: ['pod'],
            })
            .expect(200);

          const {
            body: { results },
          } = getResponse;
          expect(results.descendants).to.have.length(9);
          expect(results.descendants.every((asset: { distance: number }) => asset.distance === 2));
          expect(results.descendants.every((asset: Asset) => asset['asset.kind'] === 'pod'));
        });
      });
    });
  });
}
