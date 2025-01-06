/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';

const triggersActionsUiStartMock = {
  createStart() {
    return {
      ruleTypeRegistry: {
        has: jest.fn(),
        register: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
      },
      actionTypeRegistry: {
        has: jest.fn((x) => true),
        register: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
      },
    };
  },
};

const dataViewEditor = {
  createStart() {
    return {
      userPermissions: {
        editDataView: jest.fn(),
      },
    };
  },
};

const dataViews = {
  createStart() {
    return {
      getIds: jest.fn().mockImplementation(() => []),
      get: jest.fn(),
      create: jest.fn().mockImplementation(() => ({
        fields: {
          getByName: jest.fn(),
        },
      })),
    };
  },
};

export const sloPublicPluginsStartMock = {
  createStart() {
    return {
      cases: mockCasesContract(),
      charts: chartPluginMock.createStartContract(),
      data: dataPluginMock.createStartContract(),
      dataViewEditor: dataViewEditor.createStart(),
      dataViews: dataViews.createStart(),
      lens: lensPluginMock.createStartContract(),
      share: sharePluginMock.createStartContract(),
      triggersActionsUi: triggersActionsUiStartMock.createStart(),
      unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    };
  },
};
