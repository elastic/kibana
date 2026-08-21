/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowStatus } from '../../common/workflows/triggers/constants';

export interface PreviousStatus {
  readonly id: string;
  readonly previousStatus: WorkflowStatus;
}

export interface AlertStatusChangedPayload {
  readonly alertIds: string[];
  readonly status: WorkflowStatus;
  readonly previousStatuses: PreviousStatus[];
  readonly truncated: boolean;
}

export interface AlertTagsChangedPayload {
  readonly alertIds: string[];
  readonly tagsToAdd: string[];
  readonly tagsToRemove: string[];
  readonly truncated: boolean;
}

export interface AlertAssigneesChangedPayload {
  readonly alertIds: string[];
  readonly assigneesToAdd: string[];
  readonly assigneesToRemove: string[];
  readonly truncated: boolean;
}

export interface AttackStatusChangedPayload {
  readonly attackIds: string[];
  readonly status: WorkflowStatus;
  readonly previousStatuses: PreviousStatus[];
  readonly truncated: boolean;
}

export interface AttackTagsChangedPayload {
  readonly attackIds: string[];
  readonly tagsToAdd: string[];
  readonly tagsToRemove: string[];
  readonly truncated: boolean;
}

export interface AttackAssigneesChangedPayload {
  readonly attackIds: string[];
  readonly assigneesToAdd: string[];
  readonly assigneesToRemove: string[];
  readonly truncated: boolean;
}

export interface NoteCreatedPayload {
  readonly noteId: string;
  readonly createdBy: string;
  readonly documentId: string;
}

export interface NoteUpdatedPayload {
  readonly noteId: string;
  readonly updatedBy: string;
  readonly documentId: string;
}

interface SecuritySolutionDomainEventPayloadByType {
  readonly alertStatusChanged: AlertStatusChangedPayload;
  readonly alertTagsChanged: AlertTagsChangedPayload;
  readonly alertAssigneesChanged: AlertAssigneesChangedPayload;
  readonly attackStatusChanged: AttackStatusChangedPayload;
  readonly attackTagsChanged: AttackTagsChangedPayload;
  readonly attackAssigneesChanged: AttackAssigneesChangedPayload;
  readonly noteCreated: NoteCreatedPayload;
  readonly noteUpdated: NoteUpdatedPayload;
}

export type SecuritySolutionDomainEventType = keyof SecuritySolutionDomainEventPayloadByType;

export interface SecuritySolutionEventPayload<
  TType extends SecuritySolutionDomainEventType = SecuritySolutionDomainEventType
> {
  readonly type: TType;
  readonly payload: SecuritySolutionDomainEventPayloadByType[TType];
  readonly request: KibanaRequest;
}
