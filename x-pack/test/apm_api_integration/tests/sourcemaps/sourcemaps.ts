/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import type { SourceMap } from '@kbn/apm-plugin/server/routes/source_maps/route';
import expect from '@kbn/expect';
import { sortBy, times } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  async function uploadSourceMap({
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

  async function deleteSourceMap(id: string) {
    await apmApiClient.writeUser({
      endpoint: 'DELETE /api/apm/sourcemaps/{id}',
      params: { path: { id } },
    });
  }

  async function getSourceMaps() {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /api/apm/sourcemaps',
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
        resp = await uploadSourceMap({
          serviceName: 'foo',
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

    describe.only('list source maps', () => {
      const sourceMaps: Array<APIReturnType<'POST /api/apm/sourcemaps'>> = [];
      before(async () => {
        await Promise.all(
          times(2).map(async (i) => {
            const sourceMap = await uploadSourceMap({
              serviceName: 'foo',
              serviceVersion: `1.0.${i}`,
              bundleFilePath: 'bar',
              sourcemap: {
                version: 123,
                sources: [''],
                mappings: '',
              },
            });
            sourceMaps.push(sourceMap);
          })
        );
      });

      after(async () => {
        await Promise.all(sourceMaps.map(async (sourceMap) => deleteSourceMap(sourceMap.id)));
      });

      it('can list source maps', async () => {
        const sourceMaps = await getSourceMaps();
        expect(sourceMaps).to.not.empty();
      });

      it('returns source maps ordered by created desc', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /api/apm/sourcemaps',
        });

        const unsorted = response.body.artifacts.map((a) => a.created);
        expect(unsorted).to.eql(sortBy(unsorted, 'created'));
      });
    });

    describe('delete source maps', () => {
      let resp: APIReturnType<'POST /api/apm/sourcemaps'>;
      before(async () => {
        resp = await uploadSourceMap({
          serviceName: 'foo',
          serviceVersion: '1.0.0',
          bundleFilePath: 'bar',
          sourcemap: {
            version: 123,
            sources: [''],
            mappings: '',
          },
        });
      });

      it('can delete a source map', async () => {
        await deleteSourceMap(resp.id);
        const sourceMaps = await getSourceMaps();
        expect(sourceMaps).to.be.empty();
      });
    });
  });
}
