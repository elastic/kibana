/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This type needs to still exist due to apollo-link-http-common hasn't yet updated
// it's usage (https://github.com/apollographql/apollo-link/issues/1131)
declare type GlobalFetch = WindowOrWorkerGlobalScope;
