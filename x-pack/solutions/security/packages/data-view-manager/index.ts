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

export { DataViewManagerProvider } from './src/provider';
