/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';

import type { KibanaRequest } from '@kbn/core/server';
import type {
  SecuritySolutionEventPayload,
  SecuritySolutionDomainEventType,
  AlertStatusChangedPayload,
  AlertTagsChangedPayload,
  AlertAssigneesChangedPayload,
  AttackStatusChangedPayload,
  AttackTagsChangedPayload,
  AttackAssigneesChangedPayload,
  NoteCreatedPayload,
  NoteUpdatedPayload,
} from './types';

export type SecuritySolutionEventBusListener<
  TType extends SecuritySolutionDomainEventType = SecuritySolutionDomainEventType
> = (event: SecuritySolutionEventPayload<TType>) => void | Promise<void>;

export class SecuritySolutionEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitAlertStatusChanged(request: KibanaRequest, payload: AlertStatusChangedPayload) {
    this.emit('alertStatusChanged', { type: 'alertStatusChanged', payload, request });
  }

  emitAlertTagsChanged(request: KibanaRequest, payload: AlertTagsChangedPayload) {
    this.emit('alertTagsChanged', { type: 'alertTagsChanged', payload, request });
  }

  emitAlertAssigneesChanged(request: KibanaRequest, payload: AlertAssigneesChangedPayload) {
    this.emit('alertAssigneesChanged', { type: 'alertAssigneesChanged', payload, request });
  }

  emitAttackStatusChanged(request: KibanaRequest, payload: AttackStatusChangedPayload) {
    this.emit('attackStatusChanged', { type: 'attackStatusChanged', payload, request });
  }

  emitAttackTagsChanged(request: KibanaRequest, payload: AttackTagsChangedPayload) {
    this.emit('attackTagsChanged', { type: 'attackTagsChanged', payload, request });
  }

  emitAttackAssigneesChanged(request: KibanaRequest, payload: AttackAssigneesChangedPayload) {
    this.emit('attackAssigneesChanged', { type: 'attackAssigneesChanged', payload, request });
  }

  emitNoteCreated(request: KibanaRequest, payload: NoteCreatedPayload) {
    this.emit('noteCreated', { type: 'noteCreated', payload, request });
  }

  emitNoteUpdated(request: KibanaRequest, payload: NoteUpdatedPayload) {
    this.emit('noteUpdated', { type: 'noteUpdated', payload, request });
  }

  onAlertStatusChanged(listener: SecuritySolutionEventBusListener<'alertStatusChanged'>) {
    this.on('alertStatusChanged', listener);
  }

  onAlertTagsChanged(listener: SecuritySolutionEventBusListener<'alertTagsChanged'>) {
    this.on('alertTagsChanged', listener);
  }

  onAlertAssigneesChanged(listener: SecuritySolutionEventBusListener<'alertAssigneesChanged'>) {
    this.on('alertAssigneesChanged', listener);
  }

  onAttackStatusChanged(listener: SecuritySolutionEventBusListener<'attackStatusChanged'>) {
    this.on('attackStatusChanged', listener);
  }

  onAttackTagsChanged(listener: SecuritySolutionEventBusListener<'attackTagsChanged'>) {
    this.on('attackTagsChanged', listener);
  }

  onAttackAssigneesChanged(listener: SecuritySolutionEventBusListener<'attackAssigneesChanged'>) {
    this.on('attackAssigneesChanged', listener);
  }

  onNoteCreated(listener: SecuritySolutionEventBusListener<'noteCreated'>) {
    this.on('noteCreated', listener);
  }

  onNoteUpdated(listener: SecuritySolutionEventBusListener<'noteUpdated'>) {
    this.on('noteUpdated', listener);
  }
}
