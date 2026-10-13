/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

type ManagementApi = NonNullable<WorkflowsServerPluginSetup['management']>;

/**
 * `triggeredBy` recorded for the sub-workflows this schedules. The platform's
 * `scheduleWorkflow` requires a trigger source; the inline `runWorkflow` callers
 * do not supply one. This matches the value the generation step already records
 * for its own `scheduleWorkflow` call.
 */
export const PIPELINE_WORKFLOW_TRIGGERED_BY = 'attack-discovery-pipeline';

/**
 * Adapts the platform workflows `management` API so the generation pipeline starts
 * its sub-workflows with `scheduleWorkflow` instead of inline `runWorkflow`.
 *
 * Why: the platform runs a sub-workflow inline whenever the request it is given is a
 * fake request, so `runWorkflow` does not resolve until that sub-workflow finishes.
 * Each phase writes its tracking event only after it has the run id, so with an
 * inline run the id (and therefore the event carrying it) arrives minutes late and
 * the flyout has nothing to render while the pipeline is in progress.
 * `scheduleWorkflow` returns the id immediately, before the workflow starts running.
 *
 * Every pipeline phase already polls its sub-workflow to completion by execution id
 * (`pollForWorkflowCompletion`), and the generation step already uses
 * `scheduleWorkflow` for this same reason, so this is consistent with the existing
 * design and changes only how the run is started.
 *
 * Workflow inputs are forwarded unchanged, so what each workflow does is unaffected.
 * `triggeredBy` is an execution-trigger argument, not a workflow input, so supplying
 * a default does not change workflow behavior.
 *
 * Note: the scheduled (alerting) path already applies an equivalent adapter of its
 * own, for an unrelated APM reason. Applying both is harmless: the outer
 * `runWorkflow` calls the inner `scheduleWorkflow`, which passes straight through.
 */
export const scheduleSubWorkflows = (management: ManagementApi): ManagementApi =>
  new Proxy(management, {
    get(target, property, receiver) {
      if (property === 'runWorkflow') {
        // `runWorkflow`'s optional trailing `metadata` argument is intentionally not
        // forwarded: no pipeline caller passes it, and the two APIs type it differently.
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
            triggeredBy ?? PIPELINE_WORKFLOW_TRIGGERED_BY
          );

        return runViaScheduleWorkflow;
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
