/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { SecuritySolutionEventBus } from '../../events/event_bus';
import { registerSecurityWorkflowEventBridge } from './event_bridge';
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

const mockRequest = {} as KibanaRequest;

describe('registerSecurityWorkflowEventBridge', () => {
  let bus: SecuritySolutionEventBus;
  let mockEmitEvent: jest.Mock;
  let mockGetClient: jest.Mock;
  let mockWorkflowsExtensions: WorkflowsExtensionsServerPluginStart;
  let mockLogger: Pick<Logger, 'warn'>;

  beforeEach(() => {
    bus = new SecuritySolutionEventBus();
    mockEmitEvent = jest.fn().mockResolvedValue(undefined);
    mockGetClient = jest.fn().mockResolvedValue({ emitEvent: mockEmitEvent });
    mockWorkflowsExtensions = {
      getClient: mockGetClient,
    } as unknown as WorkflowsExtensionsServerPluginStart;
    mockLogger = { warn: jest.fn() };
  });

  afterEach(() => {
    bus.removeAllListeners();
  });

  it('does nothing when workflowsExtensions is undefined', () => {
    registerSecurityWorkflowEventBridge(bus, undefined, mockLogger as Logger);
    bus.emitAlertStatusChanged(mockRequest, {
      alertIds: [],
      status: 'open',
      previousStatuses: [],
      truncated: false,
    });
    expect(mockEmitEvent).not.toHaveBeenCalled();
  });

  describe.each([
    {
      name: 'alertStatusChanged',
      triggerId: AlertStatusChangedTriggerId,
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAlertStatusChanged(mockRequest, {
          alertIds: ['a'],
          status: 'open' as const,
          previousStatuses: [],
          truncated: false,
        }),
      expectedPayload: {
        alertIds: ['a'],
        status: 'open',
        previousStatuses: [],
        truncated: false,
      },
    },
    {
      name: 'alertTagsChanged',
      triggerId: AlertTagsChangedTriggerId,
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAlertTagsChanged(mockRequest, {
          alertIds: ['a'],
          tagsToAdd: ['t'],
          tagsToRemove: [],
          truncated: false,
        }),
      expectedPayload: { alertIds: ['a'], tagsToAdd: ['t'], tagsToRemove: [], truncated: false },
    },
    {
      name: 'alertAssigneesChanged',
      triggerId: AlertAssigneesChangedTriggerId,
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAlertAssigneesChanged(mockRequest, {
          alertIds: ['a'],
          assigneesToAdd: ['uid'],
          assigneesToRemove: [],
          truncated: false,
        }),
      expectedPayload: {
        alertIds: ['a'],
        assigneesToAdd: ['uid'],
        assigneesToRemove: [],
        truncated: false,
      },
    },
    {
      name: 'attackStatusChanged',
      triggerId: AttackStatusChangedTriggerId,
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAttackStatusChanged(mockRequest, {
          attackIds: ['a'],
          status: 'closed' as const,
          previousStatuses: [],
          truncated: false,
        }),
      expectedPayload: {
        attackIds: ['a'],
        status: 'closed',
        previousStatuses: [],
        truncated: false,
      },
    },
    {
      name: 'attackTagsChanged',
      triggerId: AttackTagsChangedTriggerId,
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAttackTagsChanged(mockRequest, {
          attackIds: ['a'],
          tagsToAdd: ['t'],
          tagsToRemove: [],
          truncated: false,
        }),
      expectedPayload: {
        attackIds: ['a'],
        tagsToAdd: ['t'],
        tagsToRemove: [],
        truncated: false,
      },
    },
    {
      name: 'attackAssigneesChanged',
      triggerId: AttackAssigneesChangedTriggerId,
      emit: (b: SecuritySolutionEventBus) =>
        b.emitAttackAssigneesChanged(mockRequest, {
          attackIds: ['a'],
          assigneesToAdd: ['uid'],
          assigneesToRemove: [],
          truncated: false,
        }),
      expectedPayload: {
        attackIds: ['a'],
        assigneesToAdd: ['uid'],
        assigneesToRemove: [],
        truncated: false,
      },
    },
    {
      name: 'noteCreated',
      triggerId: NoteCreatedTriggerId,
      emit: (b: SecuritySolutionEventBus) =>
        b.emitNoteCreated(mockRequest, {
          noteId: 'n1',
          createdBy: 'user',
          documentId: 'doc',
        }),
      expectedPayload: {
        noteId: 'n1',
        createdBy: 'user',
        documentId: 'doc',
      },
    },
    {
      name: 'noteUpdated',
      triggerId: NoteUpdatedTriggerId,
      emit: (b: SecuritySolutionEventBus) =>
        b.emitNoteUpdated(mockRequest, {
          noteId: 'n1',
          updatedBy: 'user',
          documentId: 'doc',
        }),
      expectedPayload: {
        noteId: 'n1',
        updatedBy: 'user',
        documentId: 'doc',
      },
    },
  ])('$name', ({ triggerId, emit, expectedPayload }) => {
    it('calls emitEvent with the correct trigger ID and payload', async () => {
      registerSecurityWorkflowEventBridge(bus, mockWorkflowsExtensions, mockLogger as Logger);
      emit(bus);
      // flush async microtasks from void forward(...)
      await new Promise((r) => setTimeout(r, 0));
      expect(mockGetClient).toHaveBeenCalledWith(mockRequest);
      expect(mockEmitEvent).toHaveBeenCalledWith(triggerId, expectedPayload);
    });
  });

  it('logs a warning when emitEvent throws and does not rethrow', async () => {
    mockEmitEvent.mockRejectedValue(new Error('workflow platform error'));
    registerSecurityWorkflowEventBridge(bus, mockWorkflowsExtensions, mockLogger as Logger);
    bus.emitAlertStatusChanged(mockRequest, {
      alertIds: [],
      status: 'open',
      previousStatuses: [],
      truncated: false,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(AlertStatusChangedTriggerId)
    );
  });

  it('logs a warning when getClient throws and does not rethrow', async () => {
    mockGetClient.mockRejectedValue(new Error('auth error'));
    registerSecurityWorkflowEventBridge(bus, mockWorkflowsExtensions, mockLogger as Logger);
    bus.emitNoteCreated(mockRequest, {
      noteId: 'n1',
      createdBy: 'user',
      documentId: 'doc',
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining(NoteCreatedTriggerId));
  });
});
