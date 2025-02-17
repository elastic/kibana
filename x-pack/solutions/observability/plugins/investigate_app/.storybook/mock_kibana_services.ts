/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setKibanaServices } from '@kbn/esql/public/kibana_services';
import { coreMock } from '@kbn/core/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

class LocalStorageMock {
  public store: Record<string, unknown>;
  constructor(defaultStore: Record<string, unknown>) {
    this.store = defaultStore;
  }
  clear() {
    this.store = {};
  }
  get(key: string) {
    return this.store[key] || null;
  }
  set(key: string, value: unknown) {
    this.store[key] = String(value);
  }
  remove(key: string) {
    delete this.store[key];
  }
}

const storage = new LocalStorageMock({}) as unknown as Storage;

setKibanaServices(
  {
    getJoinIndicesAutocomplete: async () => ({ indices: [] }),
    variablesService: {
      esqlVariables: [],
      areSuggestionsEnabled: false,
      enableSuggestions: () => undefined,
      disableSuggestions: () => undefined,
      clearVariables: () => undefined,
      addVariable: () => undefined,
    },
  },
  coreMock.createStart(),
  dataViewPluginMocks.createStartContract(),
  dataPluginMock.createStartContract(),
  expressionsPluginMock.createStartContract(),
  storage,
  uiActionsPluginMock.createStartContract()
);
