/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { registerAttachmentUiDefinitions, registerImpactAttachment } from '.';

describe('registerAttachmentUiDefinitions', () => {
  const mockAddAttachmentType = jest.fn();
  const mockAttachments: AttachmentServiceStartContract = {
    addAttachmentType: mockAddAttachmentType,
  } as unknown as AttachmentServiceStartContract;

  const resolveSecurityCanvasContext = jest.fn();
  const getSpaceId = jest.fn().mockResolvedValue('default');
  const mockData = { search: { search: jest.fn() } };

  const register = (aiRuleCreationEnabled = false) =>
    registerAttachmentUiDefinitions({
      attachments: mockAttachments,
      resolveSecurityCanvasContext,
      getSpaceId,
      data: mockData as never,
      aiRuleCreationEnabled,
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

  it('registers a baseline security.rule with renderConversationDetailsContent when aiRuleCreationEnabled is false', () => {
    register(false);

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.rule
    );
    expect(ruleCall).toBeDefined();
    expect(ruleCall![1].renderConversationDetailsContent).toBeDefined();
    expect(ruleCall![1].getIcon()).toBe('securityApp');
  });

  it('does not register baseline security.rule when aiRuleCreationEnabled is true', () => {
    register(true);

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.rule
    );
    expect(ruleCall).toBeUndefined();
  });

  it('baseline security.rule getLabel returns attachmentLabel when provided', () => {
    register(false);

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.rule
    );
    const label = ruleCall![1].getLabel({
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.rule,
      data: { text: JSON.stringify({ name: 'Parsed Name' }), attachmentLabel: 'My Label' },
    });
    expect(label).toBe('My Label');
  });

  it('baseline security.rule getLabel falls back to parsed rule name', () => {
    register(false);

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.rule
    );
    const label = ruleCall![1].getLabel({
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.rule,
      data: { text: JSON.stringify({ name: 'My Rule' }) },
    });
    expect(label).toBe('My Rule');
  });

  it('baseline security.rule getLabel falls back to "Security Rule" when unparseable', () => {
    register(false);

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.rule
    );
    const label = ruleCall![1].getLabel({
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.rule,
      data: { text: 'not json' },
    });
    expect(label).toBe('Security Rule');
  });

  it('registers a renderConversationDetailsContent for security.alert', () => {
    register();

    const alertCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.alert
    );
    expect(alertCall![1].renderConversationDetailsContent).toBeDefined();
  });

  it('registers a renderConversationDetailsContent for security.alerts', () => {
    register();

    const alertsCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.alerts
    );
    expect(alertsCall).toBeDefined();
    expect(alertsCall![1].renderConversationDetailsContent).toBeDefined();
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
