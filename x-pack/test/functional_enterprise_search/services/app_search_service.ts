/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

const ENTERPRISE_SEARCH_USER = 'enterprise_search';
const ENTERPRISE_SEARCH_PASSWORD = 'changeme';
import {
  createEngine,
  createMetaEngine,
  indexData,
  waitForIndexedDocs,
  destroyEngine,
  IEngine,
} from './app_search_client';

export interface IUser {
  user: string;
  password: string;
}
export type { IEngine };

export class AppSearchService {
  getEnterpriseSearchUser(): IUser {
    return {
      user: ENTERPRISE_SEARCH_USER,
      password: ENTERPRISE_SEARCH_PASSWORD,
    };
  }

  createEngine(): Promise<IEngine> {
    const engineName = `test-engine-${new Date().getTime()}`;
    return createEngine(engineName);
  }

  async createEngineWithDocs(): Promise<IEngine> {
    const engine = await this.createEngine();
    const docs = [
      { id: 1, name: 'doc1' },
      { id: 2, name: 'doc2' },
      { id: 3, name: 'doc2' },
    ];
    await indexData(engine.name, docs);
    await waitForIndexedDocs(engine.name);
    return engine;
  }

  createMetaEngine(sourceEngines: string[]): Promise<IEngine> {
    const engineName = `test-meta-engine-${new Date().getTime()}`;
    return createMetaEngine(engineName, sourceEngines);
  }

  destroyEngine(engineName: string) {
    return destroyEngine(engineName);
  }
}

export async function AppSearchServiceProvider({ getService }: FtrProviderContext) {
  const lifecycle = getService('lifecycle');
  const security = getService('security');

  lifecycle.beforeTests.add(async () => {
    // The App Search plugin passes through the current user name and password
    // through on the API call to App Search. Therefore, we need to be signed
    // in as the enterprise_search user in order for this plugin to work.
    await security.user.create(ENTERPRISE_SEARCH_USER, {
      password: ENTERPRISE_SEARCH_PASSWORD,
      roles: ['kibana_admin'],
      full_name: ENTERPRISE_SEARCH_USER,
    });
  });

  return new AppSearchService();
}
