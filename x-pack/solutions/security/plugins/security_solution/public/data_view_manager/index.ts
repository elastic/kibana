/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DataViewManagerScopeName } from './constants';

export { DataViewPicker } from './components/data_view_picker';

export { useBrowserFields } from './hooks/use_browser_fields';
export { useDataView } from './hooks/use_data_view';
export { useDataViewSpec } from './hooks/use_data_view_spec';
export { useSecurityDefaultPatterns } from './hooks/use_security_default_patterns';
export { useSelectDataView } from './hooks/use_select_data_view';
export { useSelectedPatterns } from './hooks/use_selected_patterns';
export { useSignalIndexName } from './hooks/use_signal_index_name';
export {
  useRestoreDataViewManagerStateFromURL,
  useSyncSourcererUrlState,
} from './hooks/use_sync_url_state';
export { useInitDataViewManager } from './hooks/use_init_data_view_manager';

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
export { defaultImplementation, withIndices } from './hooks/__mocks__/use_data_view';

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
export { mockDataViewManagerState } from './redux/mock';
export { dataViewManagerReducer, initialDataViewManagerState } from './redux/reducer';
export {
  signalIndexNameSelector,
  signalIndexOutdatedSelector,
  sourcererAdapterSelector,
} from './redux/selectors';
export type { RootState } from './redux/reducer';

export { buildBrowserFields } from './utils/build_browser_fields';
export { createDefaultDataView } from './utils/create_default_data_view';

export { DATA_VIEW_PICKER_TEST_ID } from './components/data_view_picker/constants';
