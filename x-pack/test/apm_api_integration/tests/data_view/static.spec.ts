/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, ApmSynthtraceEsClient, timerange } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { APM_STATIC_DATA_VIEW_ID } from '@kbn/apm-plugin/common/data_view_constants';
import { DataView } from '@kbn/data-views-plugin/common';
import request from 'superagent';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { SupertestReturnType, ApmApiError } from '../../common/apm_api_supertest';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const synthtrace = getService('synthtraceEsClient');
  const dataViewPattern = 'traces-apm*,apm-*,logs-apm*,apm-*,metrics-apm*,apm-*';

  function createDataViewWithWriteUser() {
    return apmApiClient.writeUser({ endpoint: 'POST /internal/apm/data_view/static' });
  }

  function createDataViewWithReadUser() {
    return apmApiClient.readUser({ endpoint: 'POST /internal/apm/data_view/static' });
  }

  function deleteDataView() {
    return supertest
      .delete(`/api/saved_objects/index-pattern/${APM_STATIC_DATA_VIEW_ID}?force=true`)
      .set('kbn-xsrf', 'foo');
  }

  function getDataView({ space }: { space: string }) {
    const spacePrefix = space !== 'default' ? `/s/${space}` : '';
    return supertest.get(
      `${spacePrefix}/api/saved_objects/index-pattern/${APM_STATIC_DATA_VIEW_ID}`
    );
  }

  function getDataViewSuggestions(field: string) {
    return supertest
      .post(`/api/kibana/suggestions/values/${dataViewPattern}`)
      .set('kbn-xsrf', 'foo')
      .send({ query: '', field, method: 'terms_agg' });
  }

  registry.when('no mappings exist', { config: 'basic', archives: [] }, () => {
    let response: SupertestReturnType<'POST /internal/apm/data_view/static'>;
    before(async () => {
      response = await createDataViewWithWriteUser();
    });

    it('does not create data view', async () => {
      expect(response.status).to.be(200);
      expect(response.body).to.eql({
        created: false,
        reason: 'No APM data',
      });
    });

    it('cannot fetch data view', async () => {
      const res = await getDataView({ space: 'default' });
      expect(res.status).to.be(404);
      expect(res.body.message).to.eql(
        'Saved object [index-pattern/apm_static_index_pattern_id] not found'
      );
    });
  });

  registry.when('mappings and APM data exists', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateApmData(synthtrace);
    });

    after(async () => {
      await synthtrace.clean();
    });

    afterEach(async () => {
      await deleteDataView();
    });

    describe('when creating data view with write user', () => {
      let response: SupertestReturnType<'POST /internal/apm/data_view/static'>;

      before(async () => {
        response = await createDataViewWithWriteUser();
      });

      it('successfully creates the apm data view', async () => {
        expect(response.status).to.be(200);

        // @ts-expect-error
        const dataView = response.body.dataView as DataView;

        expect(dataView.id).to.be('apm_static_index_pattern_id');
        expect(dataView.name).to.be('APM');
        expect(dataView.title).to.be('traces-apm*,apm-*,logs-apm*,apm-*,metrics-apm*,apm-*');
      });
    });

    describe('when fetching the data view', async () => {
      let dataViewResponse: request.Response;

      before(async () => {
        await createDataViewWithWriteUser();
        dataViewResponse = await getDataView({ space: 'default' });
      });

      it('return 200', () => {
        expect(dataViewResponse.status).to.be(200);
      });

      it('has correct id', () => {
        expect(dataViewResponse.body.id).to.be('apm_static_index_pattern_id');
      });

      it('has correct title', () => {
        expect(dataViewResponse.body.attributes.title).to.be(dataViewPattern);
      });

      it('has correct attributes', () => {
        expect(dataViewResponse.body.attributes.fieldFormatMap).to.be(
          JSON.stringify({
            'trace.id': {
              id: 'url',
              params: {
                urlTemplate: 'apm/link-to/trace/{{value}}',
                labelTemplate: '{{value}}',
              },
            },
            'transaction.id': {
              id: 'url',
              params: {
                urlTemplate: 'apm/link-to/transaction/{{value}}',
                labelTemplate: '{{value}}',
              },
            },
            'transaction.duration.us': {
              id: 'duration',
              params: {
                inputFormat: 'microseconds',
                outputFormat: 'asMilliseconds',
                showSuffix: true,
                useShortSuffix: true,
                outputPrecision: 2,
                includeSpaceWithSuffix: true,
              },
            },
          })
        );
      });

      // this test ensures that the default APM Data View doesn't interfere with suggestions returned in the kuery bar (this has been a problem in the past)
      it('can get suggestions for `trace.id`', async () => {
        const suggestions = await getDataViewSuggestions('trace.id');
        expect(suggestions.body.length).to.be(10);
      });
    });

    describe('when creating data view via read user', () => {
      it('throws an error', async () => {
        try {
          await createDataViewWithReadUser();
        } catch (e) {
          const err = e as ApmApiError;
          const responseBody = err.res.body;
          expect(err.res.status).to.eql(403);
          expect(responseBody.statusCode).to.eql(403);
          expect(responseBody.error).to.eql('Forbidden');
          expect(responseBody.message).to.eql('Unable to create index-pattern');
        }
      });
    });

    describe('when creating data view twice', () => {
      it('returns 200 response with reason, if data view already exists', async () => {
        await createDataViewWithWriteUser();
        const res = await createDataViewWithWriteUser();

        expect(res.status).to.be(200);
        expect(res.body).to.eql({
          created: false,
          reason: 'Dataview already exists in the active space',
        });
      });
    });

    describe('when creating data view in "default" space', async () => {
      it('can be retrieved from the "default space"', async () => {
        await createDataViewWithWriteUser();
        const res = await getDataView({ space: 'default' });
        expect(res.body.id).to.eql('apm_static_index_pattern_id');
        expect(res.body.namespaces).to.eql(['*', 'default']);
      });

      it('can be retrieved from the "foo" space', async () => {
        await createDataViewWithWriteUser();
        const res = await getDataView({ space: 'foo' });
        expect(res.body.id).to.eql('apm_static_index_pattern_id');
        expect(res.body.namespaces).to.eql(['*', 'default']);
      });
    });
  });
}

function generateApmData(synthtrace: ApmSynthtraceEsClient) {
  const range = timerange(
    new Date('2021-10-01T00:00:00.000Z').getTime(),
    new Date('2021-10-01T00:01:00.000Z').getTime()
  );

  const instance = apm
    .service({ name: 'my-service', environment: 'production', agentName: 'go' })
    .instance('my-instance');

  return synthtrace.index([
    range
      .interval('1s')
      .rate(1)
      .generator((timestamp) =>
        instance
          .transaction({ transactionName: 'GET /api' })
          .timestamp(timestamp)
          .duration(30)
          .success()
      ),
  ]);
}
