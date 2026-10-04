/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  registerAttachmentUiDefinitions,
  registerImpactAttachment,
  registerInvestigationIocsAttachment,
  registerInvestigationTimelineAttachment,
} from '.';

describe('registerAttachmentUiDefinitions', () => {
  const mockAddAttachmentType = jest.fn();
  const mockAttachments: AttachmentServiceStartContract = {
    addAttachmentType: mockAddAttachmentType,
  } as unknown as AttachmentServiceStartContract;

  const resolveSecurityCanvasContext = jest.fn();

  const register = () =>
    registerAttachmentUiDefinitions({
      attachments: mockAttachments,
      resolveSecurityCanvasContext,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns attachmentLabel when provided in alert attachment data', () => {
    register();

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.alert
    );
    const config = ruleCall![1];

    const attachment = {
      id: 'test',
      type: SecurityAgentBuilderAttachments.alert,
      data: { text: '{}', attachmentLabel: 'My Test Security Rule Alert' },
    };
    expect(config.getLabel(attachment)).toBe('My Test Security Rule Alert');
  });

  it('returns default label when attachmentLabel is not provided', () => {
    register();

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.alert
    );
    const config = ruleCall![1];

    const attachment = {
      id: 'test',
      type: SecurityAgentBuilderAttachments.alert,
      data: { text: '{}' },
    };
    expect(config.getLabel(attachment)).toBe('Security Alert');
  });

  it('does not register the security.entity attachment type (owned by registerEntityAttachment)', () => {
    register();

    const entityCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.entity
    );
    expect(entityCall).toBeUndefined();
  });

  it('registers security.alert with label and icon only (no drilldown)', () => {
    register();

    const alertCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.alert
    );
    expect(alertCall![1].renderConversationDetailsContent).toBeUndefined();
    expect(alertCall![1].getLabel).toBeDefined();
    expect(alertCall![1].getIcon).toBeDefined();
  });

  it('registers security.alerts with label and icon only (no drilldown)', () => {
    register();

    const alertsCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.alerts
    );
    expect(alertsCall).toBeDefined();
    expect(alertsCall![1].renderConversationDetailsContent).toBeUndefined();
    expect(alertsCall![1].getLabel).toBeDefined();
    expect(alertsCall![1].getIcon).toBeDefined();
  });
});

describe('registerInvestigationTimelineAttachment', () => {
  it('registers the timeline attachment synchronously', () => {
    const addAttachmentType = jest.fn();
    const attachments = { addAttachmentType } as unknown as AttachmentServiceStartContract;

    registerInvestigationTimelineAttachment({
      attachments,
      resolveSecurityCanvasContext: jest.fn(),
    });

    expect(addAttachmentType).toHaveBeenCalledWith(
      SecurityAgentBuilderAttachments.investigationTimeline,
      expect.objectContaining({
        getLabel: expect.any(Function),
        getIcon: expect.any(Function),
        renderInlineContent: expect.any(Function),
        renderConversationDetailsContent: expect.any(Function),
      })
    );
  });
});

describe('registerInvestigationIocsAttachment', () => {
  it('registers the indicators attachment synchronously', () => {
    const addAttachmentType = jest.fn();
    const attachments = { addAttachmentType } as unknown as AttachmentServiceStartContract;

    registerInvestigationIocsAttachment({
      attachments,
      resolveSecurityCanvasContext: jest.fn(),
    });

    expect(addAttachmentType).toHaveBeenCalledWith(
      SecurityAgentBuilderAttachments.investigationIocs,
      expect.objectContaining({
        getLabel: expect.any(Function),
        getIcon: expect.any(Function),
        renderInlineContent: expect.any(Function),
        renderConversationDetailsContent: expect.any(Function),
      })
    );
  });
});

describe('registerImpactAttachment', () => {
  it('registers the security.impact attachment type synchronously', () => {
    const addAttachmentType = jest.fn();
    const attachments = { addAttachmentType } as unknown as AttachmentServiceStartContract;

    registerImpactAttachment({ attachments });

    expect(addAttachmentType).toHaveBeenCalledWith(
      SecurityAgentBuilderAttachments.impact,
      expect.objectContaining({
        getIcon: expect.any(Function),
        getLabel: expect.any(Function),
        renderInlineContent: expect.any(Function),
      })
    );
  });
});
