/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import type { SourceMap } from '@kbn/apm-plugin/server/routes/source_maps/route';
import expect from '@kbn/expect';
import { first, last, times } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

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
    return response.body.artifacts;
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

      it('can upload a source map', async () => {
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
        expect(resp).to.not.empty();
      });
    });

    describe('list source maps', () => {
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
          await sleep(50);
        }
      });

      after(async () => {
        await Promise.all(uploadedSourcemapIds.map((id) => deleteSourcemap(id)));
      });

      it('can list source maps', async () => {
        const sourcemaps = await listSourcemaps();
        expect(sourcemaps).to.not.empty();
      });

      it('can paginate source maps', async () => {
        const firstPageItems = await listSourcemaps({ page: 1, perPage: 5 });
        expect(first(firstPageItems)?.identifier).to.eql('my_service-1.0.14');
        expect(last(firstPageItems)?.identifier).to.eql('my_service-1.0.10');

        const secondPageItems = await listSourcemaps({ page: 2, perPage: 5 });
        expect(first(secondPageItems)?.identifier).to.eql('my_service-1.0.9');
        expect(last(secondPageItems)?.identifier).to.eql('my_service-1.0.5');

        const thirdPageItems = await listSourcemaps({ page: 3, perPage: 5 });
        expect(first(thirdPageItems)?.identifier).to.eql('my_service-1.0.4');
        expect(last(thirdPageItems)?.identifier).to.eql('my_service-1.0.0');
      });

      it('returns newest source maps first', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /api/apm/sourcemaps',
        });

        const timestamps = response.body.artifacts.map((a) => new Date(a.created).getTime());
        expect(timestamps[0]).to.be.greaterThan(timestamps[1]);
      });
    });

    describe('delete source maps', () => {
      it('can delete a source map', async () => {
        const sourcemap = await uploadSourcemap({
          serviceName: 'my_service',
          serviceVersion: '1.0.0',
          bundleFilePath: 'bar',
          sourcemap: {
            version: 123,
            sources: [''],
            mappings: '',
          },
        });

        await deleteSourcemap(sourcemap.id);
        const sourcemaps = await listSourcemaps();
        expect(sourcemaps).to.be.empty();
      });
    });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
