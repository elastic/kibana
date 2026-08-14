/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
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

  eventBus.onAlertStatusChanged((event) => {
    void forward(AlertStatusChangedTriggerId, event.payload, event.request);
  });

  eventBus.onAlertTagsChanged((event) => {
    void forward(AlertTagsChangedTriggerId, event.payload, event.request);
  });

  eventBus.onAlertAssigneesChanged((event) => {
    void forward(AlertAssigneesChangedTriggerId, event.payload, event.request);
  });

  eventBus.onAttackStatusChanged((event) => {
    void forward(AttackStatusChangedTriggerId, event.payload, event.request);
  });

  eventBus.onAttackTagsChanged((event) => {
    void forward(AttackTagsChangedTriggerId, event.payload, event.request);
  });

  eventBus.onAttackAssigneesChanged((event) => {
    void forward(AttackAssigneesChangedTriggerId, event.payload, event.request);
  });

  eventBus.onNoteCreated((event) => {
    void forward(NoteCreatedTriggerId, event.payload, event.request);
  });

  eventBus.onNoteUpdated((event) => {
    void forward(NoteUpdatedTriggerId, event.payload, event.request);
  });
};
