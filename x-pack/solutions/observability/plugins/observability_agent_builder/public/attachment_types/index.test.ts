/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
} from '../../common/constants';
import { registerAttachmentUiDefinitions } from '.';

const mockAddAttachmentType = jest.fn();
const mockAttachments: AttachmentServiceStartContract = {
  addAttachmentType: mockAddAttachmentType,
} as unknown as AttachmentServiceStartContract;

describe('registerAttachmentUiDefinitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers all four attachment types', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    expect(mockAddAttachmentType).toHaveBeenCalledTimes(4);
  });

  it('registers AI Insight attachment type with correct config', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const aiInsightCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID
    );
    expect(aiInsightCall).toBeDefined();

    const config = aiInsightCall![1];
    expect(config.getIcon()).toBe('sparkles');
    expect(config.getLabel({ id: 'test', type: 'test', data: {} })).toBe('Summary');
  });

  it('registers alert attachment type with correct config', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const alertCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID
    );
    expect(alertCall).toBeDefined();

    const config = alertCall![1];
    expect(config.getIcon()).toBe('warning');
    expect(config.getLabel({ id: 'test', type: 'test', data: {} })).toBe('Observability alert');
  });

  it('registers error attachment type with correct config', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const errorCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID
    );
    expect(errorCall).toBeDefined();

    const config = errorCall![1];
    expect(config.getIcon()).toBe('bug');
    expect(config.getLabel({ id: 'test', type: 'test', data: {} })).toBe('APM error');
  });

  it('registers log attachment type with correct config', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const logCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID
    );
    expect(logCall).toBeDefined();

    const config = logCall![1];
    expect(config.getIcon()).toBe('logPatternAnalysis');
    expect(config.getLabel({ id: 'test', type: 'test', data: {} })).toBe('Log entry');
  });

  it('returns attachmentLabel when provided in attachment data', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const alertCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID
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
      (call) => call[0] === OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID
    );
    const config = alertCall![1];

    const attachment = {
      id: 'test',
      type: 'test',
      data: {},
    };
    expect(config.getLabel(attachment)).toBe('Observability alert');
  });

  it('returns default label when attachment data is undefined', () => {
    registerAttachmentUiDefinitions({ attachments: mockAttachments });

    const alertCall = mockAddAttachmentType.mock.calls.find(
      (call) => call[0] === OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID
    );
    const config = alertCall![1];

    const attachment = {
      id: 'test',
      type: 'test',
      data: undefined,
    };
    expect(config.getLabel(attachment)).toBe('Observability alert');
  });
});
