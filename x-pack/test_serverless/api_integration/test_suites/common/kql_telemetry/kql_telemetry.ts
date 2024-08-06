/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { get } from 'lodash';
import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { KQL_TELEMETRY_ROUTE_LATEST_VERSION } from '@kbn/data-plugin/common';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;

  describe('telemetry API', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      // TODO: Clean `kql-telemetry` before running the tests
      await kibanaServer.savedObjects.clean({ types: ['kql-telemetry'] });
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
    });
    after(async () => {
      await kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should increment the opt *in* counter in the .kibana_analytics/kql-telemetry document', async () => {
      await supertestWithoutAuth
        .post('/internal/kql_opt_in_stats')
        .set('content-type', 'application/json')
        .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .send({ opt_in: true })
        .set(roleAuthc.apiKeyHeader)
        .expect(200);

      return es
        .search({
          index: ANALYTICS_SAVED_OBJECT_INDEX,
          q: 'type:kql-telemetry',
        })
        .then((response) => {
          const kqlTelemetryDoc = get(response, 'hits.hits[0]._source.kql-telemetry');
          expect(kqlTelemetryDoc.optInCount).to.be(1);
        });
    });

    it('should increment the opt *out* counter in the .kibana_analytics/kql-telemetry document', async () => {
      await supertestWithoutAuth
        .post('/internal/kql_opt_in_stats')
        .set('content-type', 'application/json')
        .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .send({ opt_in: false })
        .set(roleAuthc.apiKeyHeader)
        .expect(200);

      return es
        .search({
          index: ANALYTICS_SAVED_OBJECT_INDEX,
          q: 'type:kql-telemetry',
        })
        .then((response) => {
          const kqlTelemetryDoc = get(response, 'hits.hits[0]._source.kql-telemetry');
          expect(kqlTelemetryDoc.optOutCount).to.be(1);
        });
    });

    it('should report success when opt *in* is incremented successfully', async () => {
      const { body } = await supertestWithoutAuth
        .post('/internal/kql_opt_in_stats')
        .set('content-type', 'application/json')
        .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .send({ opt_in: true })
        .expect('Content-Type', /json/)
        .set(roleAuthc.apiKeyHeader)
        .expect(200);
      expect(body.success).to.be(true);
    });

    it('should report success when opt *out* is incremented successfully', async () => {
      const { body } = await supertestWithoutAuth
        .post('/internal/kql_opt_in_stats')
        .set('content-type', 'application/json')
        .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .send({ opt_in: false })
        .expect('Content-Type', /json/)
        .set(roleAuthc.apiKeyHeader)
        .expect(200);
      expect(body.success).to.be(true);
    });

    it('should only accept literal boolean values for the opt_in POST body param', function () {
      return Promise.all([
        supertestWithoutAuth
          .post('/internal/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({ opt_in: 'notabool' })
          .expect(400),
        supertestWithoutAuth
          .post('/internal/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({ opt_in: 0 })
          .expect(400),
        supertestWithoutAuth
          .post('/internal/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({ opt_in: null })
          .expect(400),
        supertestWithoutAuth
          .post('/internal/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({ opt_in: undefined })
          .expect(400),
        supertestWithoutAuth
          .post('/internal/kql_opt_in_stats')
          .set('content-type', 'application/json')
          .set(ELASTIC_HTTP_VERSION_HEADER, KQL_TELEMETRY_ROUTE_LATEST_VERSION)
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({})
          .expect(400),
      ]);
    });
  });
}
