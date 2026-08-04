/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public API for the data view manager. Consumers should import hooks,
 * components, utilities and constants from here rather than deep-importing
 * individual files. This mirrors the single public entry point the module
 * will expose once it is extracted into a package.
 */

export {
  DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
  SLICE_PREFIX,
  PageScope,
} from '@kbn/data-view-manager';

export * from './hooks/use_data_view';
export * from './hooks/use_browser_fields';
export * from './hooks/use_selected_patterns';
export * from './hooks/use_security_default_patterns';
export * from './hooks/use_signal_index_name';
export * from './hooks/use_signal_index_mapping_outdated';
export * from './hooks/use_data_view_manager_status';
export * from './hooks/use_select_data_view';
export * from './hooks/use_saved_data_views';
export * from './hooks/use_init_data_view_manager';
export * from './hooks/use_sync_url_state';

export * from './components/data_view_picker';

export * from './utils/paths';
export * from './utils/build_browser_fields';

// Imperative selector for non-React consumers (e.g. redux middleware).
export { scopedDataViewSelector } from '@kbn/data-view-manager';
