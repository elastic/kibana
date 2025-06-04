/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Capabilities } from '@kbn/core/types';

export function extractExceptionsCapabilities(capabilities: Capabilities) {
  const exceptionsRead = capabilities.securitySolutionExceptions?.read === true;
  const exceptionsCrud = capabilities.securitySolutionExceptions?.crud === true;
  return { read: exceptionsRead, crud: exceptionsCrud };
}
