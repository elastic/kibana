/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  GET_PAGE_FILTER_STORAGE_KEY,
  migrateAlertPageControlsTo816,
} from './migrate_alert_page_controls';
import type { StartPlugins } from '../../../types';

const OLD_FORMAT = {
  viewMode: 'view',
  id: '5bc0ef0f-c6a9-4eaf-9fc5-9703fcb85482',
  panels: {
    '0': {
      type: 'optionsListControl',
      order: 0,
      grow: true,
      width: 'small',
      explicitInput: {
        id: '0',
        dataViewId: 'security_solution_alerts_dv',
        fieldName: 'kibana.alert.workflow_status',
        title: 'Status',
        hideExclude: true,
        hideSort: true,
        hidePanelTitles: true,
        placeholder: '',
        ignoreParentSettings: {
          ignoreValidations: true,
        },
        selectedOptions: ['open'],
        hideActionBar: true,
        persist: true,
        hideExists: true,
        existsSelected: false,
        exclude: false,
      },
    },
    '1': {
      type: 'optionsListControl',
      order: 1,
      grow: true,
      width: 'small',
      explicitInput: {
        id: '1',
        dataViewId: 'security_solution_alerts_dv',
        fieldName: 'kibana.alert.severity',
        title: 'Severity',
        hideExclude: true,
        hideSort: true,
        hidePanelTitles: true,
        placeholder: '',
        ignoreParentSettings: {
          ignoreValidations: true,
        },
        selectedOptions: [],
        hideActionBar: true,
        hideExists: true,
        existsSelected: false,
        exclude: false,
      },
    },
    '2': {
      type: 'optionsListControl',
      order: 2,
      grow: true,
      width: 'small',
      explicitInput: {
        id: '2',
        dataViewId: 'security_solution_alerts_dv',
        fieldName: 'user.name',
        title: 'User',
        hideExclude: true,
        hideSort: true,
        hidePanelTitles: true,
        placeholder: '',
        ignoreParentSettings: {
          ignoreValidations: true,
        },
        selectedOptions: [],
        existsSelected: false,
        exclude: false,
      },
    },
    '3': {
      type: 'optionsListControl',
      order: 3,
      grow: true,
      width: 'small',
      explicitInput: {
        id: '3',
        dataViewId: 'security_solution_alerts_dv',
        fieldName: 'host.name',
        title: 'Host',
        hideExclude: true,
        hideSort: true,
        hidePanelTitles: true,
        placeholder: '',
        ignoreParentSettings: {
          ignoreValidations: true,
        },
        selectedOptions: [],
        existsSelected: false,
        exclude: false,
      },
    },
  },
  defaultControlWidth: 'small',
  defaultControlGrow: true,
  controlStyle: 'oneLine',
  chainingSystem: 'HIERARCHICAL',
  showApplySelections: false,
  ignoreParentSettings: {
    ignoreFilters: false,
    ignoreQuery: false,
    ignoreTimerange: false,
    ignoreValidations: false,
  },
  timeRange: {
    from: '2024-09-10T22:00:00.000Z',
    to: '2024-09-11T21:59:59.999Z',
    mode: 'absolute',
  },
  filters: [
    {
      meta: {
        alias: null,
        negate: true,
        disabled: false,
        type: 'exists',
        key: 'kibana.alert.building_block_type',
        index: 'security-solution-default',
      },
      query: {
        exists: {
          field: 'kibana.alert.building_block_type',
        },
      },
    },
  ],
  query: {
    query: '',
    language: 'kuery',
  },
};

const NEW_FORMAT = {
  initialChildControlState: {
    '0': {
      type: 'optionsListControl',
      order: 0,
      hideExclude: true,
      hideSort: true,
      placeholder: '',
      width: 'small',
      dataViewId: 'security_solution_alerts_dv',
      title: 'Status',
      fieldName: 'kibana.alert.workflow_status',
      selectedOptions: ['open'],
      hideActionBar: true,
      persist: true,
      hideExists: true,
    },
    '1': {
      type: 'optionsListControl',
      order: 1,
      hideExclude: true,
      hideSort: true,
      placeholder: '',
      width: 'small',
      dataViewId: 'security_solution_alerts_dv',
      title: 'Severity',
      fieldName: 'kibana.alert.severity',
      selectedOptions: [],
      hideActionBar: true,
      hideExists: true,
    },
    '2': {
      type: 'optionsListControl',
      order: 2,
      hideExclude: true,
      hideSort: true,
      placeholder: '',
      width: 'small',
      dataViewId: 'security_solution_alerts_dv',
      title: 'User',
      fieldName: 'user.name',
    },
    '3': {
      type: 'optionsListControl',
      order: 3,
      hideExclude: true,
      hideSort: true,
      placeholder: '',
      width: 'small',
      dataViewId: 'security_solution_alerts_dv',
      title: 'Host',
      fieldName: 'host.name',
    },
  },
  labelPosition: 'oneLine',
  chainingSystem: 'HIERARCHICAL',
  autoApplySelections: false,
  ignoreParentSettings: {
    ignoreValidations: false,
  },
  editorConfig: {
    hideWidthSettings: true,
    hideDataViewSelector: true,
    hideAdditionalSettings: true,
  },
};
const storage = new Storage(localStorage);

const mockPlugins = {
  spaces: {
    getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
  },
} as unknown as StartPlugins;

describe('migrateAlertPageControlsTo816', () => {
  beforeEach(() => {
    storage.clear();
  });
  describe('Default space', () => {
    beforeEach(() => {
      if (mockPlugins.spaces?.getActiveSpace) {
        mockPlugins.spaces.getActiveSpace = jest.fn().mockResolvedValue({ id: 'default' });
      }
    });
    it('should migrate the old format to the new format', async () => {
      storage.set(GET_PAGE_FILTER_STORAGE_KEY(), OLD_FORMAT);
      await migrateAlertPageControlsTo816(storage, mockPlugins);
      const migrated = storage.get(GET_PAGE_FILTER_STORAGE_KEY());
      expect(migrated).toMatchObject(NEW_FORMAT);
    });

    it('should be a no-op if the new format already exists', async () => {
      storage.set(GET_PAGE_FILTER_STORAGE_KEY(), NEW_FORMAT);
      await migrateAlertPageControlsTo816(storage, mockPlugins);
      const migrated = storage.get(GET_PAGE_FILTER_STORAGE_KEY());
      expect(migrated).toMatchObject(NEW_FORMAT);
    });

    it('should be a no-op if no value is present in localstorage for page filters ', async () => {
      await migrateAlertPageControlsTo816(storage, mockPlugins);
      const migrated = storage.get(GET_PAGE_FILTER_STORAGE_KEY());
      expect(migrated).toBeNull();
    });

    it('should convert custom old format correctly', async () => {
      const MODIFIED_OLD_FORMAT = structuredClone(OLD_FORMAT);
      MODIFIED_OLD_FORMAT.panels['0'].explicitInput.hideExists = true;
      MODIFIED_OLD_FORMAT.chainingSystem = 'NONE';
      storage.set(GET_PAGE_FILTER_STORAGE_KEY(), MODIFIED_OLD_FORMAT);
      await migrateAlertPageControlsTo816(storage, mockPlugins);
      const migrated = storage.get(GET_PAGE_FILTER_STORAGE_KEY());
      const EXPECTED_NEW_FORMAT = structuredClone(NEW_FORMAT);
      EXPECTED_NEW_FORMAT.initialChildControlState['0'].hideExists = true;
      EXPECTED_NEW_FORMAT.chainingSystem = 'NONE';
      expect(migrated).toMatchObject(EXPECTED_NEW_FORMAT);
    });
  });

  describe('Non Default space', () => {
    const nonDefaultSpaceId = 'space1';
    beforeEach(() => {
      if (mockPlugins.spaces?.getActiveSpace) {
        mockPlugins.spaces.getActiveSpace = jest.fn().mockResolvedValue({ id: nonDefaultSpaceId });
      }
    });
    it('should migrate the old format to the new format', async () => {
      storage.set(GET_PAGE_FILTER_STORAGE_KEY(nonDefaultSpaceId), OLD_FORMAT);
      await migrateAlertPageControlsTo816(storage, mockPlugins);
      const migrated = storage.get(GET_PAGE_FILTER_STORAGE_KEY(nonDefaultSpaceId));
      expect(migrated).toMatchObject(NEW_FORMAT);
    });

    it('should be a no-op if the new format already exists', async () => {
      storage.set(GET_PAGE_FILTER_STORAGE_KEY(nonDefaultSpaceId), NEW_FORMAT);
      await migrateAlertPageControlsTo816(storage, mockPlugins);
      const migrated = storage.get(GET_PAGE_FILTER_STORAGE_KEY(nonDefaultSpaceId));
      expect(migrated).toMatchObject(NEW_FORMAT);
    });

    it('should be a no-op if no value is present in localstorage for page filters ', async () => {
      await migrateAlertPageControlsTo816(storage, mockPlugins);
      const migrated = storage.get(GET_PAGE_FILTER_STORAGE_KEY(nonDefaultSpaceId));
      expect(migrated).toBeNull();
    });

    it('should convert custom old format correctly', async () => {
      const MODIFIED_OLD_FORMAT = structuredClone(OLD_FORMAT);
      MODIFIED_OLD_FORMAT.panels['0'].explicitInput.hideExists = true;
      MODIFIED_OLD_FORMAT.chainingSystem = 'NONE';
      storage.set(GET_PAGE_FILTER_STORAGE_KEY(nonDefaultSpaceId), MODIFIED_OLD_FORMAT);
      await migrateAlertPageControlsTo816(storage, mockPlugins);
      const migrated = storage.get(GET_PAGE_FILTER_STORAGE_KEY(nonDefaultSpaceId));
      const EXPECTED_NEW_FORMAT = structuredClone(NEW_FORMAT);
      EXPECTED_NEW_FORMAT.initialChildControlState['0'].hideExists = true;
      EXPECTED_NEW_FORMAT.chainingSystem = 'NONE';
      expect(migrated).toMatchObject(EXPECTED_NEW_FORMAT);
    });
  });
});
