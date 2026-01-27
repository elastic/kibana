/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { registerAttachmentUiDefinitions } from '.';

describe('registerAttachmentUiDefinitions', () => {
  const mockAddAttachmentType = jest.fn();
  const mockAttachments: AttachmentServiceStartContract = {
    addAttachmentType: mockAddAttachmentType,
  } as unknown as AttachmentServiceStartContract;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers all three attachment types', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    expect(mockAddAttachmentType).toHaveBeenCalledTimes(3);
  });

  it('registers alert attachment type with correct config', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const alertCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === SecurityAgentBuilderAttachments.alert
    );
    expect(alertCall).toBeDefined();

    const config = alertCall![1];
    expect(config.getIcon()).toBe('bell');
    expect(config.getLabel({ id: 'test', type: 'test', data: {} })).toBe('Security Alert');
  });

  it('registers entity attachment type with correct config', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const entityCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === SecurityAgentBuilderAttachments.entity
    );
    expect(entityCall).toBeDefined();

    const config = entityCall![1];
    expect(config.getIcon()).toBe('user');
    expect(config.getLabel({ id: 'test', type: 'test', data: {} })).toBe('Risk Entity');
  });

  it('registers rule attachment type with correct config', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === SecurityAgentBuilderAttachments.rule
    );
    expect(ruleCall).toBeDefined();

    const config = ruleCall![1];
    expect(config.getIcon()).toBe('document');
    expect(config.getLabel({ id: 'test', type: 'test', data: {} })).toBe('Security Rule');
  });

  it('returns attachmentLabel when provided in attachment data', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const alertCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === SecurityAgentBuilderAttachments.alert
    );
    const config = alertCall![1];

    const attachment = {
      id: 'test',
      type: 'test',
      data: { attachmentLabel: 'Custom Label' },
    };
    expect(config.getLabel(attachment)).toBe('Custom Label');
  });

  it('returns default label when attachmentLabel is not provided', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const alertCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === SecurityAgentBuilderAttachments.alert
    );
    const config = alertCall![1];

    const attachment = {
      id: 'test',
      type: 'test',
      data: {},
    };
    expect(config.getLabel(attachment)).toBe('Security Alert');
  });

  it('returns default label when attachment data is undefined', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const alertCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === SecurityAgentBuilderAttachments.alert
    );
    const config = alertCall![1];

    const attachment = {
      id: 'test',
      type: 'test',
      data: undefined,
    };
    expect(config.getLabel(attachment)).toBe('Security Alert');
  });
});
