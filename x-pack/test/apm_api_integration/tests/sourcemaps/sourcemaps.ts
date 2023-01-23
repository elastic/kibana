/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pRetry from 'p-retry';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import type { ApmSourceMap } from '@kbn/apm-plugin/server/routes/source_maps/create_apm_source_map_index_template';
import type { SourceMap } from '@kbn/apm-plugin/server/routes/source_maps/route';
import expect from '@kbn/expect';
import { first, last, times } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const SAMPLE_SOURCEMAP = {
  version: 3,
  file: 'out.js',
  sourceRoot: '',
  sources: ['foo.js', 'bar.js'],
  sourcesContent: ['', null],
  names: ['src', 'maps', 'are', 'fun'],
  mappings: 'A,AAAB;;ABCDE;',
};

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const esClient = getService('es');

  function waitForSourceMapCount(expectedCount: number) {
    const getSourceMapCount = async () => {
      const res = await esClient.search({
        index: '.apm-source-map',
        size: 0,
        track_total_hits: true,
      });

      // @ts-expect-error
      const actualCount = res.hits.total.value as number;

      if (expectedCount === actualCount) {
        return expectedCount;
      }

      throw new Error(`Expected ${expectedCount} source maps, got ${actualCount}`);
    };

    return pRetry(getSourceMapCount, { minTimeout: 100, retries: 10, factor: 1.5 }); // max wait is ~17s (https://www.wolframalpha.com/input?i2d=true&i=sum+100*Power%5B1.5%2Cj%5D%5C%2844%29+j%3D1+to+10)
  }

  async function deleteAllApmSourceMaps() {
    await esClient.deleteByQuery({
      index: '.apm-source-map*',
      refresh: true,
      query: { match_all: {} },
    });
  }

  async function deleteAllFleetSourceMaps() {
    return esClient.deleteByQuery({
      index: '.fleet-artifacts*',
      refresh: true,
      query: {
        bool: {
          filter: [{ term: { type: 'sourcemap' } }, { term: { package_name: 'apm' } }],
        },
      },
    });
  }

  async function uploadSourcemap({
    bundleFilePath,
    serviceName,
    serviceVersion,
    sourcemap,
  }: {
    bundleFilePath: string;
    serviceName: string;
    serviceVersion: string;
    sourcemap: SourceMap;
  }) {
    const response = await apmApiClient.writeUser({
      endpoint: 'POST /api/apm/sourcemaps',
      type: 'form-data',
      params: {
        body: {
          bundle_filepath: bundleFilePath,
          service_name: serviceName,
          service_version: serviceVersion,
          sourcemap: JSON.stringify(sourcemap),
        },
      },
    });
    return response.body;
  }

  async function runSourceMapMigration() {
    await apmApiClient.writeUser({
      endpoint: 'POST /internal/apm/sourcemaps/migrate_fleet_artifacts',
    });
  }

  async function deleteSourcemap(id: string) {
    await apmApiClient.writeUser({
      endpoint: 'DELETE /api/apm/sourcemaps/{id}',
      params: { path: { id } },
    });
  }

  async function listSourcemaps({ page, perPage }: { page?: number; perPage?: number } = {}) {
    const query = page && perPage ? { page, perPage } : {};

    const response = await apmApiClient.readUser({
      endpoint: 'GET /api/apm/sourcemaps',
      params: { query },
    });
    return response.body;
  }

  registry.when('source maps', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await Promise.all([deleteAllFleetSourceMaps(), deleteAllApmSourceMaps()]);
    });

    let resp: APIReturnType<'POST /api/apm/sourcemaps'>;
    describe('upload source map', () => {
      after(async () => {
        await apmApiClient.writeUser({
          endpoint: 'DELETE /api/apm/sourcemaps/{id}',
          params: { path: { id: resp.id } },
        });
      });

      before(async () => {
        resp = await uploadSourcemap({
          serviceName: 'uploading-test',
          serviceVersion: '1.0.0',
          bundleFilePath: 'bar',
          sourcemap: SAMPLE_SOURCEMAP,
        });

        await waitForSourceMapCount(1);
      });

      it('is uploaded as a fleet artifact', async () => {
        const res = await esClient.search({
          index: '.fleet-artifacts',
          size: 1,
          query: {
            bool: {
              filter: [{ term: { type: 'sourcemap' } }, { term: { package_name: 'apm' } }],
            },
          },
        });

        // @ts-expect-error
        expect(res.hits.hits[0]._source.identifier).to.be('uploading-test-1.0.0');
      });

      it('is added to .apm-source-map index', async () => {
        const res = await esClient.search({
          index: '.apm-source-map',
        });

        const doc = res.hits.hits[0]._source as ApmSourceMap;
        expect(doc.content).to.be(
          'eJyrVipLLSrOzM9TsjI0MtZRKs4vLUpOLVayilZSitVRyk0sKMjMSwfylZRqAURLDgo='
        );
        expect(doc.content_sha256).to.be(
          '02dd950aa88a66183d312a7a5f44d72fc9e3914cdbbe5e3a04f1509a8a3d7d83'
        );
        expect(doc.file.path).to.be('bar');
        expect(doc.service.name).to.be('uploading-test');
        expect(doc.service.version).to.be('1.0.0');
      });
    });

    describe('list source maps', async () => {
      before(async () => {
        const totalCount = 6;
        const sourcemapCount = times(totalCount);
        for (const i of sourcemapCount) {
          await uploadSourcemap({
            serviceName: 'list-test',
            serviceVersion: `1.0.${i}`,
            bundleFilePath: 'bar',
            sourcemap: SAMPLE_SOURCEMAP,
          });
        }
        await waitForSourceMapCount(totalCount);
      });

      after(async () => {
        await Promise.all([deleteAllFleetSourceMaps(), deleteAllApmSourceMaps()]);
      });

      describe('pagination', () => {
        it('can retrieve the first page', async () => {
          const res = await listSourcemaps({ page: 1, perPage: 2 });
          expect(first(res.artifacts)?.identifier).to.eql('list-test-1.0.5');
          expect(last(res.artifacts)?.identifier).to.eql('list-test-1.0.4');
          expect(res.artifacts.length).to.be(2);
          expect(res.total).to.be(6);
        });

        it('can retrieve the second page', async () => {
          const res = await listSourcemaps({ page: 2, perPage: 2 });
          expect(first(res.artifacts)?.identifier).to.eql('list-test-1.0.3');
          expect(last(res.artifacts)?.identifier).to.eql('list-test-1.0.2');
          expect(res.artifacts.length).to.be(2);
          expect(res.total).to.be(6);
        });

        it('can retrieve the third page', async () => {
          const res = await listSourcemaps({ page: 3, perPage: 2 });
          expect(first(res.artifacts)?.identifier).to.eql('list-test-1.0.1');
          expect(last(res.artifacts)?.identifier).to.eql('list-test-1.0.0');
          expect(res.artifacts.length).to.be(2);
          expect(res.total).to.be(6);
        });
      });

      it('can list source maps without specifying pagination options', async () => {
        const sourcemaps = await listSourcemaps();
        expect(sourcemaps.artifacts.length).to.be(6);
        expect(sourcemaps.total).to.be(6);
      });

      it('returns newest source maps first', async () => {
        const { artifacts } = await listSourcemaps();
        const timestamps = artifacts.map((a) => new Date(a.created).getTime());
        expect(timestamps[0]).to.be.greaterThan(timestamps[1]);
      });
    });

    function getRandomString() {
      return Math.random().toString(36).substring(7);
    }

    describe('delete source maps', () => {
      before(async () => {
        const sourcemap = await uploadSourcemap({
          serviceName: `delete-test_${getRandomString()}`,
          serviceVersion: '1.0.0',
          bundleFilePath: 'bar',
          sourcemap: SAMPLE_SOURCEMAP,
        });

        // wait for the sourcemap to be indexed in .apm-source-map index
        await waitForSourceMapCount(1);

        // delete sourcemap
        await deleteSourcemap(sourcemap.id);

        // wait for the sourcemap to be deleted from .apm-source-map index
        await waitForSourceMapCount(0);
      });

      it('can delete a fleet source map artifact', async () => {
        const { artifacts, total } = await listSourcemaps();
        expect(artifacts).to.be.empty();
        expect(total).to.be(0);
      });

      it('can delete an apm source map', async () => {
        // check that the sourcemap is deleted from .apm-source-map index
        const res = await esClient.search({ index: '.apm-source-map' });
        // @ts-expect-error
        expect(res.hits.total.value).to.be(0);
      });
    });

    describe('source map migration from fleet artifacts to `.apm-source-map`', () => {
      const totalCount = 100;

      before(async () => {
        await Promise.all(
          times(totalCount).map(async (i) => {
            await uploadSourcemap({
              serviceName: `migration-test`,
              serviceVersion: `1.0.${i}`,
              bundleFilePath: 'bar',
              sourcemap: SAMPLE_SOURCEMAP,
            });
          })
        );

        // wait for sourcemaps to be indexed in .apm-source-map index
        await waitForSourceMapCount(totalCount);
      });

      it('it will migrate fleet artifacts to `.apm-source-map`', async () => {
        await deleteAllApmSourceMaps();

        // wait for source maps to be deleted before running migration
        await waitForSourceMapCount(0);

        await runSourceMapMigration();

        expect(await waitForSourceMapCount(totalCount)).to.be(totalCount);
      });
    });
  });
}
