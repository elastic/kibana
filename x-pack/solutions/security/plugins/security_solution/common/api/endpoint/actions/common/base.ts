/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The base response action request schema now lives in
// @kbn/security-solution-endpoint-common so that platform-group modules — Agent Builder and
// Workflows — can import it; a platform module cannot depend on this plugin, which is
// group: "security", visibility: "private".
//
// This file re-exports it so existing import paths keep working. Exports are named rather
// than `export *`, so the surface this module exposes stays explicit.
//
// Note the `comment` field is now bounded by the package's own
// MAX_RESPONSE_ACTION_COMMENT_LENGTH rather than by this plugin's MAX_COMMENT_LENGTH. The
// two share a value but bound unrelated things — MAX_COMMENT_LENGTH bounds the rule
// exceptions and event filters UI.

export {
  AgentTypeSchemaLiteral,
  agentTypesSchema,
  BaseActionRequestSchema,
  HostOsTypeSchemaLiteral,
  MAX_RESPONSE_ACTION_COMMENT_LENGTH,
  NoParametersRequestSchema,
  type BaseActionRequestBody,
} from '@kbn/security-solution-endpoint-common';
