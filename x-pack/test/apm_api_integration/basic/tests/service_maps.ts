/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function serviceMapsApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Service Maps', () => {
    it('fails with a 403 forbidden', async () => {
      const response = await supertest.get(
        '/api/apm/service-map?start=2020-06-28T10%3A24%3A46.055Z&end=2020-06-29T10%3A24%3A46.055Z'
      );

      expect(response.status).to.be(403);
      expect(response.body.message).to.be(
        "In order to access Service Maps, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability to visualize your entire application stack along with your APM data."
      );
    });
  });
}
