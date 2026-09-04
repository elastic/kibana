/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The command x action-type x agent-type support matrix now lives in
// @kbn/security-solution-endpoint-common so that platform-group modules — Agent Builder
// and Workflows — can import it; a platform module cannot depend on this plugin, which
// is group: "security", visibility: "private".
//
// This file re-exports it so existing import paths keep working. Exports are named
// rather than `export *`, so the surface this module exposes stays explicit.
//
// Note the matrix itself stays private to the package. Callers needing the set of agent
// types that support an action derive it from the exported predicate, for example:
//
//   RESPONSE_ACTION_AGENT_TYPE.filter((agentType) =>
//     isActionSupportedByAgentType(agentType, 'isolate', 'manual')
//   );

export { isActionSupportedByAgentType } from '@kbn/security-solution-endpoint-common';
