/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SecuritySolutionEventBus } from './event_bus';

const mockRequest = {} as KibanaRequest;

describe('SecuritySolutionEventBus', () => {
  let bus: SecuritySolutionEventBus;

  beforeEach(() => {
    bus = new SecuritySolutionEventBus();
  });

  afterEach(() => {
    bus.removeAllListeners();
  });

  it('sets max listeners to 50', () => {
    expect(bus.getMaxListeners()).toBe(50);
  });

  describe.each([
    {
      name: 'alertStatusChanged',
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAlertStatusChanged(mockRequest, {
          alertIds: ['a1'],
          status: 'acknowledged' as const,
          previousStatuses: [],
          truncated: false,
        }),
      on: (b: SecuritySolutionEventBus, cb: jest.Mock) => b.onAlertStatusChanged(cb),
      expectedPayload: {
        alertIds: ['a1'],
        status: 'acknowledged',
        previousStatuses: [],
        truncated: false,
      },
      otherEmit: (b: SecuritySolutionEventBus) =>
        b.emitAlertTagsChanged(mockRequest, {
          alertIds: [],
          tagsToAdd: [],
          tagsToRemove: [],
          truncated: false,
        }),
    },
    {
      name: 'alertTagsChanged',
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAlertTagsChanged(mockRequest, {
          alertIds: ['a'],
          tagsToAdd: ['t'],
          tagsToRemove: [],
          truncated: false,
        }),
      on: (b: SecuritySolutionEventBus, cb: jest.Mock) => b.onAlertTagsChanged(cb),
      expectedPayload: { alertIds: ['a'], tagsToAdd: ['t'], tagsToRemove: [], truncated: false },
      otherEmit: (b: SecuritySolutionEventBus) =>
        b.emitAlertStatusChanged(mockRequest, {
          alertIds: [],
          status: 'open' as const,
          previousStatuses: [],
          truncated: false,
        }),
    },
    {
      name: 'alertAssigneesChanged',
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAlertAssigneesChanged(mockRequest, {
          alertIds: ['a'],
          assigneesToAdd: ['uid'],
          assigneesToRemove: [],
          truncated: false,
        }),
      on: (b: SecuritySolutionEventBus, cb: jest.Mock) => b.onAlertAssigneesChanged(cb),
      expectedPayload: {
        alertIds: ['a'],
        assigneesToAdd: ['uid'],
        assigneesToRemove: [],
        truncated: false,
      },
      otherEmit: (b: SecuritySolutionEventBus) =>
        b.emitAlertTagsChanged(mockRequest, {
          alertIds: [],
          tagsToAdd: [],
          tagsToRemove: [],
          truncated: false,
        }),
    },
    {
      name: 'attackStatusChanged',
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAttackStatusChanged(mockRequest, {
          attackIds: ['a'],
          status: 'closed' as const,
          previousStatuses: [],
          truncated: false,
        }),
      on: (b: SecuritySolutionEventBus, cb: jest.Mock) => b.onAttackStatusChanged(cb),
      expectedPayload: {
        attackIds: ['a'],
        status: 'closed',
        previousStatuses: [],
        truncated: false,
      },
      otherEmit: (b: SecuritySolutionEventBus) =>
        b.emitAlertTagsChanged(mockRequest, {
          alertIds: [],
          tagsToAdd: [],
          tagsToRemove: [],
          truncated: false,
        }),
    },
    {
      name: 'attackTagsChanged',
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAttackTagsChanged(mockRequest, {
          attackIds: ['a'],
          tagsToAdd: ['t'],
          tagsToRemove: [],
          truncated: false,
        }),
      on: (b: SecuritySolutionEventBus, cb: jest.Mock) => b.onAttackTagsChanged(cb),
      expectedPayload: {
        attackIds: ['a'],
        tagsToAdd: ['t'],
        tagsToRemove: [],
        truncated: false,
      },
      otherEmit: (b: SecuritySolutionEventBus) =>
        b.emitAlertTagsChanged(mockRequest, {
          alertIds: [],
          tagsToAdd: [],
          tagsToRemove: [],
          truncated: false,
        }),
    },
    {
      name: 'attackAssigneesChanged',
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAttackAssigneesChanged(mockRequest, {
          attackIds: ['a'],
          assigneesToAdd: ['uid'],
          assigneesToRemove: [],
          truncated: false,
        }),
      on: (b: SecuritySolutionEventBus, cb: jest.Mock) => b.onAttackAssigneesChanged(cb),
      expectedPayload: {
        attackIds: ['a'],
        assigneesToAdd: ['uid'],
        assigneesToRemove: [],
        truncated: false,
      },
      otherEmit: (b: SecuritySolutionEventBus) =>
        b.emitAlertTagsChanged(mockRequest, {
          alertIds: [],
          tagsToAdd: [],
          tagsToRemove: [],
          truncated: false,
        }),
    },
    {
      name: 'noteCreated',
      emit: (b: SecuritySolutionEventBus) =>
        b.emitNoteCreated(mockRequest, {
          noteId: 'n1',
          createdBy: 'user',
          documentId: 'doc',
        }),
      on: (b: SecuritySolutionEventBus, cb: jest.Mock) => b.onNoteCreated(cb),
      expectedPayload: {
        noteId: 'n1',
        createdBy: 'user',
        documentId: 'doc',
      },
      otherEmit: (b: SecuritySolutionEventBus) =>
        b.emitAlertTagsChanged(mockRequest, {
          alertIds: [],
          tagsToAdd: [],
          tagsToRemove: [],
          truncated: false,
        }),
    },
    {
      name: 'noteUpdated',
      emit: (b: SecuritySolutionEventBus) =>
        b.emitNoteUpdated(mockRequest, {
          noteId: 'n1',
          updatedBy: 'user',
          documentId: 'doc',
        }),
      on: (b: SecuritySolutionEventBus, cb: jest.Mock) => b.onNoteUpdated(cb),
      expectedPayload: {
        noteId: 'n1',
        updatedBy: 'user',
        documentId: 'doc',
      },
      otherEmit: (b: SecuritySolutionEventBus) =>
        b.emitAlertTagsChanged(mockRequest, {
          alertIds: [],
          tagsToAdd: [],
          tagsToRemove: [],
          truncated: false,
        }),
    },
  ])('$name', ({ emit, on, expectedPayload, otherEmit }) => {
    it('listener receives the correct event shape', () => {
      const listener = jest.fn();
      on(bus, listener);
      emit(bus);
      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0];
      expect(event.request).toBe(mockRequest);
      expect(event.payload).toEqual(expectedPayload);
    });

    it('does not call listener for other event types', () => {
      const listener = jest.fn();
      on(bus, listener);
      otherEmit(bus);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
