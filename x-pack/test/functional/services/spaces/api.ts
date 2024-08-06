/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Chance from 'chance';
import { FtrProviderContext } from '../../ftr_provider_context';

const chance = new Chance();

interface CreateOptions {
  name?: string;
  id?: string;
  description?: string;
  color?: string;
  solution?: 'es' | 'oblt' | 'security' | 'classic';
  disabledFeatures?: string[];
}

export function ApiProvider({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const supertest = getService('supertest');
  const log = getService('log');
  const browser = getService('browser');

  return {
    async create({
      name = 'my space',
      id = chance.guid(),
      description = 'a description',
      color = '#5c5959',
      solution,
      disabledFeatures = [],
    }: CreateOptions = {}) {
      const res = await supertest.post(`/api/spaces/space`).set('kbn-xsrf', 'true').send({
        name,
        id,
        description,
        color,
        solution,
        disabledFeatures,
      });

      if (res.statusCode === 200) {
        log.debug(`Space [${id}] created.`);
      } else {
        throw new Error(`Could not create space [${id}]. [${res.body.message}]`);
      }

      const cleanUp = async () => {
        // Make sure we are back on the default space
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces', {
          basePath: '',
          shouldUseHashForSubUrl: false,
        });

        return this.delete(id);
      };

      return {
        id,
        response: res.body,
        cleanUp,
      };
    },
    async createAndNavigateToSpace(options?: CreateOptions) {
      const res = await this.create(options);

      // Navigate to the root of the space to make sure the redirect to the correct home will occur
      // This is why we don't use common.navigateToUrl, which requires an "app" to be provided.
      await browser.navigateTo(`http://localhost:5620/s/${res.id}`);
      return res;
    },
    async get(spaceId: string) {
      const res = await supertest.get(`/api/spaces/space/${spaceId}`);
      return res.body;
    },
    async delete(spaceId: string) {
      const res = await supertest.delete(`/api/spaces/space/${spaceId}`).set('kbn-xsrf', 'true');

      if (res.statusCode === 204) {
        log.debug(`Space [${spaceId}] deleted.`);
      } else {
        throw new Error(`Could not delete space [${spaceId}]. [${res.body}]`);
      }

      return res.body;
    },
  };
}
