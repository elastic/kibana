/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, EMPTY } from 'rxjs';
import {
  KI_FEATURE_ATTACHMENT_TYPE,
  SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
  SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
} from '@kbn/significant-events-plugin/common';
import { FocusedSignificantEventService } from '../focused_significant_event_service';
import { registerNightshiftAgentBuilderAttachments } from './significant_event_attachments';

const createDependencies = (addAttachmentType: jest.Mock, loggerError = jest.fn()) => ({
  agentBuilder: {
    addAttachment: jest.fn(),
    attachments: { addAttachmentType },
    events: {
      ui: { activeConversation$: new BehaviorSubject(null).asObservable() },
      getChatEvents$: jest.fn(() => EMPTY),
    },
  } as never,
  chrome: {
    sidebar: { getCurrentAppId$: () => new BehaviorSubject(null).asObservable() },
  } as never,
  share: {} as never,
  focusedSignificantEventService: new FocusedSignificantEventService(),
  logger: { error: loggerError } as never,
});

describe('registerNightshiftAgentBuilderAttachments', () => {
  it('registers all three attachment types', () => {
    const addAttachmentType = jest.fn();
    const cleanup = registerNightshiftAgentBuilderAttachments(
      createDependencies(addAttachmentType)
    );

    cleanup();

    expect(addAttachmentType).toHaveBeenCalledWith(KI_FEATURE_ATTACHMENT_TYPE, expect.any(Object));
    expect(addAttachmentType).toHaveBeenCalledWith(
      SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
      expect.any(Object)
    );
    expect(addAttachmentType).toHaveBeenCalledWith(
      SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
      expect.any(Object)
    );
  });

  it('continues registering attachment types after one registration fails', () => {
    const addAttachmentType = jest.fn((type: string) => {
      if (type === KI_FEATURE_ATTACHMENT_TYPE) {
        throw new Error('duplicate attachment type');
      }
    });
    const loggerError = jest.fn();
    const cleanup = registerNightshiftAgentBuilderAttachments(
      createDependencies(addAttachmentType, loggerError)
    );

    cleanup();

    expect(addAttachmentType).toHaveBeenCalledWith(
      SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
      expect.any(Object)
    );
    expect(addAttachmentType).toHaveBeenCalledWith(
      SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
      expect.any(Object)
    );
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining(KI_FEATURE_ATTACHMENT_TYPE));
  });
});
