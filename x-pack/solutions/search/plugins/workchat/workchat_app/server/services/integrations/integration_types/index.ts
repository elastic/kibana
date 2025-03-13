/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationRegistry } from '../integration_registry';
import { getCustomIntegrationDefinition } from './custom_integration';

export const registerInternalIntegrationTypes = ({
  registry,
}: {
  registry: IntegrationRegistry;
}) => {
  registry.register(getCustomIntegrationDefinition());
};
