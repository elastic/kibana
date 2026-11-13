/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  NIGHTSHIFT_PROMPTS_PACKAGE_NAME,
  PROMPTS_PACKAGE_CHECK_INTERVAL_MS,
  createPromptsPackageInstaller,
} from './ensure_prompts_package';
export { createInvestigatorPromptsResolver } from './resolve_investigator_prompts';
