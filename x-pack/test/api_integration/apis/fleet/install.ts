/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('fleet_install', () => {
    it('should return a 400 if we try download an install script for a not supported OS', async () => {
      await supertest.get(`/api/ingest_manager/fleet/install/gameboy`).expect(400);
    });

    it('should return an install script for a supported OS', async () => {
      const { text: apiResponse } = await supertest
        .get(`/api/ingest_manager/fleet/install/macos`)
        .expect(200);
      expect(apiResponse).match(/^#!\/bin\/sh/);
    });
  });
}
