/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { registerAttachmentUiDefinitions } from '.';

describe('registerAttachmentUiDefinitions', () => {
  const mockAddAttachmentType = jest.fn();
  const mockAttachments: AttachmentServiceStartContract = {
    addAttachmentType: mockAddAttachmentType,
  } as unknown as AttachmentServiceStartContract;
  const mockApplication = {
    navigateToApp: jest.fn(),
  } as unknown as ApplicationStart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers only the rule attachment type', () => {
    registerAttachmentUiDefinitions({
      attachments: mockAttachments,
      application: mockApplication,
    });

    expect(mockAddAttachmentType).toHaveBeenCalledTimes(1);
    expect(mockAddAttachmentType).toHaveBeenCalledWith(
      SecurityAgentBuilderAttachments.rule,
      expect.any(Object)
    );
  });

  it('registers rule attachment type with correct config', () => {
    registerAttachmentUiDefinitions({
      attachments: mockAttachments,
      application: mockApplication,
    });

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.rule
    );
    expect(ruleCall).toBeDefined();

    const config = ruleCall![1];
    expect(config.getIcon()).toBe('securityApp');
    expect(config.getLabel({ id: 'test', type: 'test', data: {} })).toBe('Security Rule');
  });

  it('returns attachmentLabel when provided in rule attachment data', () => {
    registerAttachmentUiDefinitions({
      attachments: mockAttachments,
      application: mockApplication,
    });

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.rule
    );
    const config = ruleCall![1];

    const attachment = {
      id: 'test',
      type: SecurityAgentBuilderAttachments.rule,
      data: { text: '{}', attachmentLabel: 'Custom Rule Name' },
    };
    expect(config.getLabel(attachment)).toBe('Custom Rule Name');
  });

  it('returns default label when attachmentLabel is not provided', () => {
    registerAttachmentUiDefinitions({
      attachments: mockAttachments,
      application: mockApplication,
    });

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.rule
    );
    const config = ruleCall![1];

    const attachment = {
      id: 'test',
      type: SecurityAgentBuilderAttachments.rule,
      data: { text: '{}' },
    };
    expect(config.getLabel(attachment)).toBe('Security Rule');
  });
});
