/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import fs from 'fs/promises';
import path from 'path';
import semverCoerce from 'semver/functions/coerce';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('Agent available_versions API', () => {
    const VERSIONS_FILE_PATH = 'x-pack/plugins/fleet/target/';
    const FILENAME = 'agent_versions_list.json';
    before(async () => {
      try {
        await fs.access(VERSIONS_FILE_PATH);
      } catch (error) {
        await fs.mkdir(VERSIONS_FILE_PATH);
      }
    });
    const writeJson = async (versions: string[]) => {
      const json = JSON.stringify({ versions });
      await fs.writeFile(path.resolve(VERSIONS_FILE_PATH, FILENAME), json);
    };

    describe('GET /api/fleet/agents/available_versions', () => {
      it('should fail if no file was generated at build time', async () => {
        await fs.unlink(path.resolve(VERSIONS_FILE_PATH, FILENAME));
        await supertest.get(`/api/fleet/agents/available_versions`).expect(500);
      });

      it('should return a list of versions > 7.17.0', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        const kibanaVersionCoerced = semverCoerce(kibanaVersion)?.version;
        const versions = [
          '8.3.1',
          '8.4.0',
          '8.3.2',
          '8.3.0',
          '8.2.0-SNAPSHOT',
          '8.2.0',
          '8.4.0-SNAPSHOT',
          '7.16.0',
          '7.17.3',
        ];
        await writeJson(versions);
        const res = await supertest.get(`/api/fleet/agents/available_versions`).expect(200);
        const expectedVersions = res.body.items;

        expect(expectedVersions).to.eql([
          kibanaVersionCoerced,
          '8.4.0',
          '8.3.2',
          '8.3.1',
          '8.3.0',
          '8.2.0',
          '7.17.3',
        ]);
      });

      it('should cache the file', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        const kibanaVersionCoerced = semverCoerce(kibanaVersion)?.version;
        const res = await supertest.get(`/api/fleet/agents/available_versions`).expect(200);
        const expectedVersions = res.body.items;
        expect(expectedVersions).to.eql([
          kibanaVersionCoerced,
          '8.4.0',
          '8.3.2',
          '8.3.1',
          '8.3.0',
          '8.2.0',
          '7.17.3',
        ]);
      });
    });
  });
}
