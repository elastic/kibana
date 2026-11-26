/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistrableEntityDefinition } from '@kbn/entity-store/server';
import { k8sDeploymentDefinition } from './k8s_deployment';

/** The Kubernetes definitions this plugin registers. */
export const KUBERNETES_DEFINITIONS: readonly RegistrableEntityDefinition[] = [
  k8sDeploymentDefinition,
];
