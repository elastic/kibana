/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DockerContainerMetrics, KubernetesContainerMetrics } from './charts/types';
import { IntegrationEventModules } from './types';

export const ASSET_DETAILS_FLYOUT_COMPONENT_NAME = 'infraAssetDetailsFlyout';
export const ASSET_DETAILS_PAGE_COMPONENT_NAME = 'infraAssetDetailsPage';

export const APM_HOST_FILTER_FIELD = 'host.hostname';
export const APM_CONTAINER_FILTER_FIELD = 'container.id';

export const ASSET_DETAILS_URL_STATE_KEY = 'assetDetails';

export const INTEGRATIONS = {
  [IntegrationEventModules.kubernetesNode]: 'kubernetes.node',
  [IntegrationEventModules.kubernetesContainer]: 'kubernetes.container',
  [IntegrationEventModules.docker]: 'docker',
};

export const DOCKER_METRIC_TYPES: DockerContainerMetrics[] = ['cpu', 'memory', 'network', 'disk'];
export const KUBERNETES_METRIC_TYPES: KubernetesContainerMetrics[] = ['cpu', 'memory'];

export const APM_HOST_TROUBLESHOOTING_LINK = 'https://ela.st/host-troubleshooting';

// Regex pattern to match formulas where 'avg' is the first function
// Matches: "avg(...)", "1 - avg(...)", "100 * avg(...)", "(avg(...))", etc.
// Allows optional whitespace, numbers, and arithmetic operators before 'avg'
export const AVG_AS_FIRST_FUNCTION_PATTERN = /^\s*[\d\s\-+*/()]*\bavg\b/i;

// Regex pattern to match formulas where 'max' is the first function
// Matches: "max(...)", "1 - max(...)", "100 * max(...)", "(max(...))", etc.
// Allows optional whitespace, numbers, and arithmetic operators before 'max'
export const MAX_AS_FIRST_FUNCTION_PATTERN = /^\s*[\d\s\-+*/()]*\bmax\b/i;
