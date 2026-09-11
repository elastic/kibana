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

  it('returns attachmentLabel when provided in alert attachment data', () => {
    registerAttachmentUiDefinitions(mockAttachments);

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
    registerAttachmentUiDefinitions(mockAttachments);

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

  it('registers the investigation IoCs type with its default label, icon, and label override', () => {
    const type = SecurityAgentBuilderAttachments.investigationIocs;
    registerAttachmentUiDefinitions(mockAttachments);

    const registered = mockAddAttachmentType.mock.calls.find((call: unknown[]) => call[0] === type);
    const config = registered![1];

    expect(config.getIcon()).toBe('flag');
    expect(config.getLabel({ id: 'test', type, data: {} })).toBe('Indicators of compromise');
    expect(config.getLabel({ id: 'test', type, data: { attachmentLabel: 'Custom' } })).toBe(
      'Custom'
    );
    expect(typeof config.renderInlineContent).toBe('function');
  });

  // The timeline payload is the bare event array, so there is nowhere in `data` for an
  // `attachmentLabel` — the attachment's own `description` carries the override instead.
  describe('investigation timeline label', () => {
    const type = SecurityAgentBuilderAttachments.investigationTimeline;
    const data = [{ timestamp: '2026-09-10T12:00:00.000Z', host: 'h', description: 'd' }];

    const getConfig = () => {
      registerAttachmentUiDefinitions(mockAttachments);
      return mockAddAttachmentType.mock.calls.find((call: unknown[]) => call[0] === type)![1];
    };

    it('uses the timeline icon', () => {
      expect(getConfig().getIcon()).toBe('timeline');
    });

    it('prefers the attachment description over the default label', () => {
      expect(
        getConfig().getLabel({
          id: 'test',
          type,
          data,
          description: 'Attack timeline: WKSTN-RECV01',
        })
      ).toBe('Attack timeline: WKSTN-RECV01');
    });

    it('falls back to the default label when there is no description', () => {
      expect(getConfig().getLabel({ id: 'test', type, data })).toBe('Attack timeline');
    });

    it('falls back to the default label for an empty description', () => {
      expect(getConfig().getLabel({ id: 'test', type, data, description: '' })).toBe(
        'Attack timeline'
      );
    });

    it('registers an inline renderer', () => {
      expect(typeof getConfig().renderInlineContent).toBe('function');
    });
  });

  it('does not register the security.entity attachment type (owned by registerEntityAttachment)', () => {
    registerAttachmentUiDefinitions(mockAttachments);

    const entityCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.entity
    );
    expect(entityCall).toBeUndefined();
  });
});
