/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowItem } from '../../types';

const ATTACK_DISCOVERY_TAG_PREFIX = 'attackDiscovery:';
const VALIDATE_TAG = 'attackDiscovery:validate';

/**
 * Pre-defined Attack Discovery workflow tags that should NOT appear in the
 * alert retrieval step (Step 1). These workflows either handle generation,
 * validation, or are the built-in default retrieval (handled separately).
 */
const TAGS_EXCLUDED_FROM_ALERT_RETRIEVAL: ReadonlySet<string> = new Set([
  'attackDiscovery:default_alert_retrieval',
  'attackDiscovery:generation',
  'attackDiscovery:validate',
]);

const hasTag = (workflow: WorkflowItem, tag: string): boolean =>
  workflow.tags?.includes(tag) ?? false;

const hasAnyTag = (workflow: WorkflowItem, tags: ReadonlySet<string>): boolean =>
  workflow.tags?.some((t) => tags.has(t)) ?? false;

const hasAttackDiscoveryTag = (workflow: WorkflowItem): boolean =>
  workflow.tags?.some((t) => t.startsWith(ATTACK_DISCOVERY_TAG_PREFIX)) ?? false;

/**
 * Filters workflows for the alert retrieval step (Step 1).
 *
 * Excludes pre-defined workflows that are not alert retrieval workflows:
 * - Default Alert Retrieval (handled as the built-in default, not selectable)
 * - Generation (does not perform alert retrieval)
 * - Default Validation (does not perform alert retrieval)
 */
export const filterWorkflowsForAlertRetrieval = (workflows: WorkflowItem[]): WorkflowItem[] =>
  workflows.filter((workflow) => !hasAnyTag(workflow, TAGS_EXCLUDED_FROM_ALERT_RETRIEVAL));

/**
 * Filters workflows for the validation step (Step 3).
 *
 * Excludes all pre-defined Attack Discovery workflows EXCEPT the default
 * validation workflow. Custom (user-created) workflows without
 * `attackDiscovery:*` tags are always included.
 */
export const filterWorkflowsForValidation = (workflows: WorkflowItem[]): WorkflowItem[] =>
  workflows.filter(
    (workflow) => !hasAttackDiscoveryTag(workflow) || hasTag(workflow, VALIDATE_TAG)
  );
