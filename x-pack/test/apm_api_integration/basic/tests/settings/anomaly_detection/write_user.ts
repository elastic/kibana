/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function apiTest({ getService }: FtrProviderContext) {
  const apmWriteUser = getService('supertestAsApmWriteUser');

  function getAnomalyDetectionJobs() {
    return apmWriteUser.get(`/api/apm/settings/anomaly-detection/jobs`).set('kbn-xsrf', 'foo');
  }

  function createAnomalyDetectionJobs(environments: string[]) {
    return apmWriteUser
      .post(`/api/apm/settings/anomaly-detection/jobs`)
      .send({ environments })
      .set('kbn-xsrf', 'foo');
  }

  describe('when user has write access to ML', () => {
    describe('when calling the endpoint for listing jobs', () => {
      it('returns an error because the user is on basic license', async () => {
        const { body } = await getAnomalyDetectionJobs();

        expect(body.statusCode).to.be(403);
        expect(body.error).to.be('Forbidden');
        expectSnapshot(body.message).toMatchInline(
          `"To use anomaly detection, you must be subscribed to an Elastic Platinum license. With it, you'll be able to monitor your services with the aid of machine learning."`
        );
      });
    });

    describe('when calling create endpoint', () => {
      it('returns an error because the user is on basic license', async () => {
        const { body } = await createAnomalyDetectionJobs(['production', 'staging']);

        expect(body.statusCode).to.be(403);
        expect(body.error).to.be('Forbidden');

        expectSnapshot(body.message).toMatchInline(
          `"To use anomaly detection, you must be subscribed to an Elastic Platinum license. With it, you'll be able to monitor your services with the aid of machine learning."`
        );
      });
    });
  });
}
