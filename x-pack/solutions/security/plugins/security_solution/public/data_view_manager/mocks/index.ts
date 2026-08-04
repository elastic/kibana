/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Single public entry point for the data view manager test mocks. Import test
 * fixtures from here rather than deep-importing individual mock files.
 */
export * from './mock_data_view';
export * from './timeline_data_view';
export { mockDataViewManagerState, mockTimelineDataViewId } from '../redux/mock';
