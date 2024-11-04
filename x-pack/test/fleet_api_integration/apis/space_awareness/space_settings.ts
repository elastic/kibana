/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { SpaceTestApiClient } from './api_helper';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  describe('space_settings', function () {
    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await spaces.createTestSpace(TEST_SPACE_1);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
    });

    const apiClient = new SpaceTestApiClient(supertest);

    describe('In the default space', () => {
      it('should allow to set and get space settings', async () => {
        const settings = await apiClient.getSpaceSettings();
        expect(settings.item).to.eql({
          allowed_namespace_prefixes: [],
        });
        // Update settings
        await apiClient.putSpaceSettings({
          allowed_namespace_prefixes: ['test1', 'test2'],
        });
        expect((await apiClient.getSpaceSettings()).item).to.eql({
          allowed_namespace_prefixes: ['test1', 'test2'],
        });
        // Clear settings
        await apiClient.putSpaceSettings({
          allowed_namespace_prefixes: [],
        });
        expect((await apiClient.getSpaceSettings()).item).to.eql({
          allowed_namespace_prefixes: [],
        });
      });
    });

    describe('In a specific space', () => {
      it('should allow to set and get space settings', async () => {
        const settings = await apiClient.getSpaceSettings(TEST_SPACE_1);
        expect(settings.item).to.eql({
          allowed_namespace_prefixes: [],
        });
        // Update settings
        await apiClient.putSpaceSettings(
          {
            allowed_namespace_prefixes: ['test1', 'test2'],
          },
          TEST_SPACE_1
        );
        expect((await apiClient.getSpaceSettings(TEST_SPACE_1)).item).to.eql({
          allowed_namespace_prefixes: ['test1', 'test2'],
        });
        // Clear settings
        await apiClient.putSpaceSettings(
          {
            allowed_namespace_prefixes: [],
          },
          TEST_SPACE_1
        );
        expect((await apiClient.getSpaceSettings(TEST_SPACE_1)).item).to.eql({
          allowed_namespace_prefixes: [],
        });
      });

      describe('with allowed_namespace_prefixes:["test"]', () => {
        before(async () => {
          await apiClient.putSpaceSettings(
            {
              allowed_namespace_prefixes: ['test'],
            },
            TEST_SPACE_1
          );
        });
        it('should restrict non authorized agent policy namespace', async () => {
          let err: Error | undefined;
          try {
            await apiClient.createAgentPolicy(TEST_SPACE_1, {
              namespace: 'default',
            });
          } catch (_err) {
            err = _err;
          }

          expect(err).to.be.an(Error);
          expect(err?.message).to.match(/400 "Bad Request"/);
        });
        it('should allow authorized agent policy namespace', async () => {
          await apiClient.createAgentPolicy(TEST_SPACE_1, {
            namespace: 'test_production',
          });
        });
      });
    });
  });
}
