/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These types now live in @kbn/security-solution-endpoint-common so that platform-group
// modules — Agent Builder and Workflows — can import them; a platform module cannot
// depend on this plugin, which is group: "security", visibility: "private".
//
// This file re-exports them so existing import paths keep working. Exports are named
// rather than `export *`, so the surface this module exposes stays explicit.

export type {
  EndpointAuthz,
  EndpointAuthzKeyList,
  EndpointPrivileges,
} from '@kbn/security-solution-endpoint-common';
