/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// State and hooks are stored in separate mock files for when a file needs to
// import a basic history mock without automatically jest.mock()ing all of React Router
export * from './state.mock';
export * from './hooks.mock';

// For example usage, @see public/applications/shared/react_router_helpers/eui_link.test.tsx
