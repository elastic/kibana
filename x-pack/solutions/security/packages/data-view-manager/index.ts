/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public entry point for the data view manager package.
 *
 * NOTE: the redux primitives (reducer, slices, actions, selectors) are exported
 * transitionally while the module is being migrated out of the security_solution
 * plugin. They will become package-internal once the hooks, components and
 * listeners live here and consumers interact with the package solely through its
 * provider, hooks and components.
 */

export * from './src/constants';
export * from './src/redux/types';
export * from './src/redux/actions';
export * from './src/redux/slices';
export * from './src/redux/reducer';
export * from './src/redux/selectors';

export * from './src/utils/build_browser_fields';
export * from './src/utils/init_data_view';

/**
 * Engine hooks. `useInitDataViewManager` wires the listeners and returns the
 * init dispatcher; `useSetSignalIndex` lets the host push signal index metadata
 * into the store.
 */
export { useInitDataViewManager } from './src/hooks/use_init_data_view_manager';
export { useSetSignalIndex } from './src/hooks/use_set_signal_index';

/**
 * Typed store hooks bound to the package's own react-redux context. Exposed
 * transitionally so the plugin-side hooks can read/write the package store
 * while they still live in the plugin; they will become package-internal once
 * those hooks move here.
 */
export {
  useSelector as useDataViewManagerSelector,
  useDispatch as useDataViewManagerDispatch,
} from './src/redux/redux';

/**
 * The package's singleton redux store. Exposed for imperative, non-React
 * consumers (e.g. redux middleware in the host) that need to read the current
 * selection outside of the React tree. React consumers should use the hooks.
 */
export { store as dataViewManagerStore } from './src/redux/redux';

export { DataViewManagerProvider } from './src/provider';
export type { DataViewManagerProviderProps } from './src/provider';

/**
 * Test fixtures. Exposed so the host can seed `DataViewManagerTestProvider`.
 */
export { mockDataViewManagerState, mockTimelineDataViewId } from './src/redux/mock';

export {
  DataViewManagerDependenciesProvider,
  useDataViewManagerDependencies,
  useDataViewManagerServices,
} from './src/context';

export { DataViewManagerTestProvider } from './src/test/provider';
export type { DataViewManagerTestProviderProps } from './src/test/provider';
export type {
  DataViewManagerServices,
  DataViewManagerDependencies,
  CreateDefaultDataView,
  CreateDefaultDataViewResult,
  CreateExploreDataView,
} from './src/context';
