/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import {
  createWorkflowTriggerForwarder,
  type WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { SecuritySolutionEventBus } from '../../events/event_bus';
import {
  AlertStatusChangedTriggerId,
  AlertTagsChangedTriggerId,
  AlertAssigneesChangedTriggerId,
  AttackStatusChangedTriggerId,
  AttackTagsChangedTriggerId,
  AttackAssigneesChangedTriggerId,
  NoteCreatedTriggerId,
  NoteUpdatedTriggerId,
} from '../../../common/workflows/triggers';

export const registerSecurityWorkflowEventBridge = (
  eventBus: SecuritySolutionEventBus,
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined,
  logger: Logger
): void => {
  if (!workflowsExtensions) {
    return;
  }

  const forward = createWorkflowTriggerForwarder(workflowsExtensions, logger);

  const forwardEvent = (triggerId: string, payload: unknown, request: KibanaRequest) => {
    forward(triggerId, payload, request).catch((err: unknown) => {
      logger.warn(`Failed to forward workflow trigger event [${triggerId}]: ${err}`);
    });
  };

  eventBus.onAlertStatusChanged((event) => {
    forwardEvent(AlertStatusChangedTriggerId, event.payload, event.request);
  });

  eventBus.onAlertTagsChanged((event) => {
    forwardEvent(AlertTagsChangedTriggerId, event.payload, event.request);
  });

  eventBus.onAlertAssigneesChanged((event) => {
    forwardEvent(AlertAssigneesChangedTriggerId, event.payload, event.request);
  });

  eventBus.onAttackStatusChanged((event) => {
    forwardEvent(AttackStatusChangedTriggerId, event.payload, event.request);
  });

  eventBus.onAttackTagsChanged((event) => {
    forwardEvent(AttackTagsChangedTriggerId, event.payload, event.request);
  });

  eventBus.onAttackAssigneesChanged((event) => {
    forwardEvent(AttackAssigneesChangedTriggerId, event.payload, event.request);
  });

  eventBus.onNoteCreated((event) => {
    forwardEvent(NoteCreatedTriggerId, event.payload, event.request);
  });

  eventBus.onNoteUpdated((event) => {
    forwardEvent(NoteUpdatedTriggerId, event.payload, event.request);
  });
};
