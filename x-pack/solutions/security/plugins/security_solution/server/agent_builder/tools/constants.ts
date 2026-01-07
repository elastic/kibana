/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';

/**
 * Creates a security tool ID with the core.security namespace.
 */
export const securityTool = (toolName: string): string => {
  return `${internalNamespaces.security}.${toolName}`;
};
