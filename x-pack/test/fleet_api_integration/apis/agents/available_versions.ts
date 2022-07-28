/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import fs from 'fs/promises';
import path from 'path';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');

  describe('Agent available_versions API', () => {
    const VERSIONS_FILE_PATH = 'build/kibana/x-pack/plugins/fleet/target/';
    const FILENAME = 'agent_versions_list.txt';

    describe('GET /api/fleet/agents/available_versions', () => {
      it('should respond 200 if a static file was generated at build time', async () => {
        const versionsList = ['8.4.0', '8.3.2', '8.3.1', '8.3.0', '8.2.0'].join(', ');
        await fs.writeFile(path.resolve(VERSIONS_FILE_PATH, FILENAME), versionsList);
        const res = await supertest.get(`/api/fleet/agents/available_versions`).expect(200);
        const versions = res.body.items;
        expect(versions.length).to.be(5);
      });
    });

    it('should return a list of versions > 7.17.0', async () => {
      const versionsList = ['8.4.0', '8.3.2', '8.3.1', '8.3.0', '8.2.0', '7.16.0', '7.17.1'].join(
        ', '
      );
      await fs.writeFile(path.resolve(VERSIONS_FILE_PATH, FILENAME), versionsList);
      const res = await supertest.get(`/api/fleet/agents/available_versions`).expect(200);
      const versions = res.body.items;
      expect(versions.length).to.be(6);
      expect(versions).to.eql(['8.4.0', '8.3.2', '8.3.1', '8.3.0', '8.2.0', '7.17.1']);
    });

    it('should return an ordered list with no prerelease versions or duplicates', async () => {
      const versionsList = [
        '8.3.1',
        '8.4.0',
        '8.3.2',
        '8.3.0',
        '8.2.0-SNAPSHOT',
        '8.2.0',
        '8.4.0-SNAPSHOT',
        '7.17.3',
      ].join(', ');
      await fs.writeFile(path.resolve(VERSIONS_FILE_PATH, FILENAME), versionsList);
      const res = await supertest.get(`/api/fleet/agents/available_versions`).expect(200);
      const versions = res.body.items;
      expect(versions).to.eql(['8.4.0', '8.3.2', '8.3.1', '8.3.0', '8.2.0', '7.17.3']);
    });

    it('should fail if no file was generated at build time', async () => {
      await fs.unlink(path.resolve(VERSIONS_FILE_PATH, FILENAME));
      await supertest.get(`/api/fleet/agents/available_versions`).expect(500);
    });
  });
}
