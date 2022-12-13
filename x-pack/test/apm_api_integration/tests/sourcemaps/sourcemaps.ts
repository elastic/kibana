/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import type { ApmSourceMap } from '@kbn/apm-plugin/server/routes/source_maps/create_apm_source_map_index_template';
import type { SourceMap } from '@kbn/apm-plugin/server/routes/source_maps/route';
import expect from '@kbn/expect';
import { first, last, times } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const esClient = getService('es');

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
          serviceName: 'my_service',
          serviceVersion: '1.0.0',
          bundleFilePath: 'bar',
          sourcemap: {
            version: 123,
            sources: [''],
            mappings: '',
          },
        });
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
        expect(res.hits.hits[0]._source.identifier).to.be('my_service-1.0.0');
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
        expect(doc.service.name).to.be('my_service');
        expect(doc.service.version).to.be('1.0.0');
      });
    });

    describe('list source maps', async () => {
      const uploadedSourcemapIds: string[] = [];
      before(async () => {
        const sourcemapCount = times(15);
        for (const i of sourcemapCount) {
          const sourcemap = await uploadSourcemap({
            serviceName: 'my_service',
            serviceVersion: `1.0.${i}`,
            bundleFilePath: 'bar',
            sourcemap: {
              version: 123,
              sources: [''],
              mappings: '',
            },
          });
          uploadedSourcemapIds.push(sourcemap.id);
        }
      });

      after(async () => {
        await Promise.all(uploadedSourcemapIds.map((id) => deleteSourcemap(id)));
      });

      describe('pagination', () => {
        it('can retrieve the first page', async () => {
          const firstPageItems = await listSourcemaps({ page: 1, perPage: 5 });
          expect(first(firstPageItems.artifacts)?.identifier).to.eql('my_service-1.0.14');
          expect(last(firstPageItems.artifacts)?.identifier).to.eql('my_service-1.0.10');
          expect(firstPageItems.artifacts.length).to.be(5);
          expect(firstPageItems.total).to.be(15);
        });

        it('can retrieve the second page', async () => {
          const secondPageItems = await listSourcemaps({ page: 2, perPage: 5 });
          expect(first(secondPageItems.artifacts)?.identifier).to.eql('my_service-1.0.9');
          expect(last(secondPageItems.artifacts)?.identifier).to.eql('my_service-1.0.5');
          expect(secondPageItems.artifacts.length).to.be(5);
          expect(secondPageItems.total).to.be(15);
        });

        it('can retrieve the third page', async () => {
          const thirdPageItems = await listSourcemaps({ page: 3, perPage: 5 });
          expect(first(thirdPageItems.artifacts)?.identifier).to.eql('my_service-1.0.4');
          expect(last(thirdPageItems.artifacts)?.identifier).to.eql('my_service-1.0.0');
          expect(thirdPageItems.artifacts.length).to.be(5);
          expect(thirdPageItems.total).to.be(15);
        });
      });

      it('can list source maps', async () => {
        const sourcemaps = await listSourcemaps();
        expect(sourcemaps.artifacts.length).to.be(15);
        expect(sourcemaps.total).to.be(15);
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

    describe.only('delete source maps', () => {
      before(async () => {
        const sourcemap = await uploadSourcemap({
          serviceName: `my_service_${getRandomString()}`,
          serviceVersion: '1.0.0',
          bundleFilePath: 'bar',
          sourcemap: {
            version: 123,
            sources: [''],
            mappings: '',
          },
        });

        // wait for the sourcemap to be indexed in .apm-source-map index before deleting it
        await waitFor(async () => {
          const res = await esClient.search({ index: '.apm-source-map' });
          return res.hits.hits.length === 1;
        });

        await deleteSourcemap(sourcemap.id);
      });

      it('can delete a fleet source map artifact', async () => {
        const { artifacts, total } = await listSourcemaps();
        expect(artifacts).to.be.empty();
        expect(total).to.be(0);
      });

      it('can delete an apm source map', async () => {
        // wait for the sourcemap to be deleted from .apm-source-map index before checking
        await waitFor(async () => {
          const res = await esClient.search({ index: '.apm-source-map' });
          return res.hits.hits.length === 0;
        });

        // check that the sourcemap is deleted from .apm-source-map index
        const res = await esClient.search({ index: '.apm-source-map' });
        expect(res.hits.hits.length).to.eql(0);
      });
    });

    // describe('migrate fleet artifacts', () => {
    //   it('it will migrate fleet artifacts to `.apm-source-map`', async () => {
    //     migrateFleetSourceMapArtifacts({ internalESClient: es });
    //   });
    // });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(cb: () => Promise<boolean>, retries = 50): Promise<void> {
  if (retries === 0) {
    throw new Error(`Maximum number of retries reached`);
  }

  const res = await cb();
  if (!res) {
    await sleep(100);
    return waitFor(cb, retries - 1);
  }
}
