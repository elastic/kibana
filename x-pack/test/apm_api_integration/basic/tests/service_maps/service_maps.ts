/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { expectSnapshot } from '../../../common/match_snapshot';
import archives_metadata from '../../../common/archives_metadata';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function serviceMapsApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);

  describe('Service Maps', () => {
    it('is only be available to users with Platinum license (or higher)', async () => {
      const response = await supertest.get(`/api/apm/service-map?start=${start}&end=${end}`);

      expect(response.status).to.be(403);

      expectSnapshot(response.body.message).toMatchInline(
        `"In order to access Service Maps, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability to visualize your entire application stack along with your APM data."`
      );
    });
  });
}
