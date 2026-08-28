/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

type ManagementApi = NonNullable<WorkflowsServerPluginSetup['management']>;

/**
 * `triggeredBy` recorded for workflows the scheduled attack discovery orchestration
 * defers to Task Manager through this wrapper. The platform's `scheduleWorkflow`
 * requires a trigger source; the inline `runWorkflow` callers do not supply one.
 */
export const SCHEDULED_WORKFLOW_TRIGGERED_BY = 'attack-discovery-scheduled';

/**
 * Wraps the platform workflows `management` API so the scheduled (alerting) attack
 * discovery orchestration runs its sub-workflows via `scheduleWorkflow` (Task
 * Manager) instead of inline `runWorkflow`.
 *
 * Why: on the scheduled path the alerting task runner stamps an `alerting_rule_id`
 * label on the active APM transaction. The platform's
 * `WorkflowExecutionRuntimeManager.start()` reads that label, treats the run as
 * "triggered by alerting", and calls `apm.setCurrentTransaction` — a private API
 * that does not exist in `elastic-apm-node@4.15.0`, so it throws
 * `apm.setCurrentTransaction is not a function` and fails the whole rule run.
 *
 * Running the sub-workflow in a Task Manager task instead means `start()` sees the
 * task-manager transaction (no `alerting_rule_id`) and takes its safe
 * "reuse the existing transaction" branch. The orchestration already polls each
 * sub-workflow by execution id (`pollForWorkflowCompletion`), and the generation
 * step already uses `scheduleWorkflow`, so this is consistent with the existing
 * design and needs no `elastic-apm-node` import (and therefore no eslint exception).
 *
 * Workflow inputs (including `source`, which governs the persist step's
 * handover-vs-write behavior) are forwarded unchanged, so persistence is unaffected.
 * `triggeredBy` is an execution-trigger argument, not a workflow input, so supplying
 * a default does not change what the workflow does.
 */
export const wrapManagementApiForScheduledExecution = (management: ManagementApi): ManagementApi =>
  new Proxy(management, {
    get(target, property, receiver) {
      if (property === 'runWorkflow') {
        const runViaScheduleWorkflow: ManagementApi['runWorkflow'] = (
          workflow,
          spaceId,
          inputs,
          request,
          triggeredBy
        ) =>
          target.scheduleWorkflow(
            workflow,
            spaceId,
            inputs,
            request,
            triggeredBy ?? SCHEDULED_WORKFLOW_TRIGGERED_BY
          );

        return runViaScheduleWorkflow;
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
