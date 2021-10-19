/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import { copyFile, rm } from 'fs/promises';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('fonts', () => {
    const fontPath = path.join(
      process.cwd(),
      'x-pack',
      'plugins',
      'maps',
      'server',
      'fonts',
      'open_sans',
      '0-255.pbf'
    );
    const destinationPath = path.join(path.dirname(fontPath), '..', path.basename(fontPath));
    console.log({ fontPath, destinationPath });

    before(async () => {
      await copyFile(fontPath, destinationPath);
    });

    after(async () => {
      await rm(destinationPath);
    });

    it('should return fonts', async () => {
      const resp = await supertest
        .get(`/api/maps/fonts/Open%20Sans%20Regular,Arial%20Unicode%20MS%20Regular/0-255`)
        .expect(200);

      expect(resp.body.length).to.be(74696);
    });

    it('should return 404 when file not found', async () => {
      await supertest
        .get(`/api/maps/fonts/Open%20Sans%20Regular,Arial%20Unicode%20MS%20Regular/noGonaFindMe`)
        .expect(404);
    });

    it('should return 404 when file is not in font folder (..)', async () => {
      await supertest.get(`/api/maps/fonts/open_sans/..%2f0-255`).expect(404);
    });

    it('should return 404 when file is not in font folder (./..)', async () => {
      await supertest.get(`/api/maps/fonts/open_sans/.%2f..%2f0-255`).expect(404);
    });
  });
}
