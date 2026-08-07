/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WatchSettings } from '@kbn/pnd-common';
import type { WorkflowYaml } from '@kbn/workflows';
import { parseYamlToJSONWithoutValidation, updateYamlField } from '@kbn/workflows-yaml';
import { createWatchNotFoundError } from './watch_errors';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';

const createInvalidWatchSettingsError = (message: string): Error & { statusCode: number } =>
  Object.assign(new Error(message), { statusCode: 400 });

const parseWorkflowYaml = (yaml: string): WorkflowYaml => {
  const parsed = parseYamlToJSONWithoutValidation(yaml);
  if (!parsed.success || parsed.document.errors.length > 0) {
    throw createInvalidWatchSettingsError('The watch workflow YAML cannot be updated');
  }
  return parsed.json as WorkflowYaml;
};

const findSimpleScheduledTrigger = (definition: WorkflowYaml): number | undefined => {
  const triggerIndex = definition.triggers?.findIndex((trigger) => {
    const type = (trigger as { type?: string }).type;
    return type === 'scheduled' || type === 'schedule';
  });
  if (triggerIndex === undefined || triggerIndex < 0) return undefined;

  const trigger = definition.triggers?.[triggerIndex] as { with?: Record<string, unknown> };
  if (typeof trigger.with?.every !== 'string') {
    throw createInvalidWatchSettingsError(
      'This watch schedule is not a simple interval and cannot be edited here'
    );
  }
  return triggerIndex;
};

export const applyWatchSettingsToYaml = (yaml: string, settings: WatchSettings): string => {
  const definition = parseWorkflowYaml(yaml);
  const policy = definition.consts?.watch_policy;
  if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) {
    throw createInvalidWatchSettingsError('The watch workflow has no watch_policy settings block');
  }
  const scheduledTriggerIndex = findSimpleScheduledTrigger(definition);
  if (settings.scheduleInterval === null && scheduledTriggerIndex !== undefined) {
    throw createInvalidWatchSettingsError('A scheduled watch requires a schedule interval');
  }
  if (settings.scheduleInterval !== null && scheduledTriggerIndex === undefined) {
    throw createInvalidWatchSettingsError('This watch has no scheduled trigger');
  }

  let updatedYaml = updateYamlField(yaml, 'enabled', settings.enabled);
  updatedYaml = updateYamlField(updatedYaml, 'description', settings.description);
  updatedYaml = updateYamlField(
    updatedYaml,
    'consts.watch_policy.autonomyLevel',
    settings.autonomyLevel
  );

  if (settings.scheduleInterval !== null) {
    updatedYaml = updateYamlField(
      updatedYaml,
      `triggers.${scheduledTriggerIndex}.with.every`,
      settings.scheduleInterval
    );
  }

  const updatedDefinition = parseWorkflowYaml(updatedYaml);
  const updatedPolicy = updatedDefinition.consts?.watch_policy as
    | Record<string, unknown>
    | undefined;
  const updatedScheduledTriggerIndex = findSimpleScheduledTrigger(updatedDefinition);
  const updatedScheduledTrigger =
    updatedScheduledTriggerIndex === undefined
      ? undefined
      : (updatedDefinition.triggers?.[updatedScheduledTriggerIndex] as {
          with?: Record<string, unknown>;
        });
  if (
    updatedDefinition.enabled !== settings.enabled ||
    updatedDefinition.description !== settings.description ||
    updatedPolicy?.autonomyLevel !== settings.autonomyLevel ||
    (settings.scheduleInterval !== null &&
      updatedScheduledTrigger?.with?.every !== settings.scheduleInterval)
  ) {
    throw createInvalidWatchSettingsError('The watch settings could not be written safely');
  }
  return updatedYaml;
};

export const updateWatchSettings = async ({
  management,
  watchId,
  spaceId,
  request,
  settings,
}: {
  management: WatchWorkflowsManagementClient;
  watchId: string;
  spaceId: string;
  request: KibanaRequest;
  settings: WatchSettings;
}): Promise<void> => {
  const detail = await management.getWorkflow(watchId, spaceId);
  if (!detail) throw createWatchNotFoundError(watchId);
  if (detail.managed) {
    throw Object.assign(new Error(`Managed watch "${watchId}" cannot be edited`), {
      statusCode: 403,
    });
  }

  if (!detail.yaml.trim()) {
    throw createInvalidWatchSettingsError('The watch workflow has no editable definition');
  }
  const yaml = applyWatchSettingsToYaml(detail.yaml, settings);
  const updated = await management.updateWorkflow(
    watchId,
    { yaml, enabled: settings.enabled },
    spaceId,
    request
  );
  if (!updated.valid || updated.validationErrors.length > 0) {
    const details = updated.validationErrors.length
      ? `: ${updated.validationErrors.join('; ')}`
      : '';
    throw createInvalidWatchSettingsError(`The updated watch workflow is invalid${details}`);
  }
};
