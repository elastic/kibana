/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { registerAttachmentUiDefinitions } from '.';

const makeExperimentalFeatures = (
  overrides: Partial<ExperimentalFeatures> = {}
): ExperimentalFeatures =>
  ({ endpointForensicAnalysisSkill: false, ...overrides } as unknown as ExperimentalFeatures);

describe('registerAttachmentUiDefinitions', () => {
  const mockAddAttachmentType = jest.fn();
  const mockAttachments: AttachmentServiceStartContract = {
    addAttachmentType: mockAddAttachmentType,
  } as unknown as AttachmentServiceStartContract;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns attachmentLabel when provided in alert attachment data', () => {
    registerAttachmentUiDefinitions(mockAttachments, makeExperimentalFeatures());

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
    registerAttachmentUiDefinitions(mockAttachments, makeExperimentalFeatures());

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

  it('does not register forensic attachment types (owned by registerInvestigationTimelineAttachment / registerInvestigationIocsAttachment)', () => {
    registerAttachmentUiDefinitions(
      mockAttachments,
      makeExperimentalFeatures({ endpointForensicAnalysisSkill: true })
    );

    const registeredTypes = mockAddAttachmentType.mock.calls.map(
      (call: unknown[]) => call[0]
    ) as string[];
    expect(registeredTypes).not.toContain(SecurityAgentBuilderAttachments.investigationTimeline);
    expect(registeredTypes).not.toContain(SecurityAgentBuilderAttachments.investigationIocs);
  });

  it('does not register the security.entity attachment type (owned by registerEntityAttachment)', () => {
    registerAttachmentUiDefinitions(
      mockAttachments,
      makeExperimentalFeatures({ endpointForensicAnalysisSkill: true })
    );

    const entityCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.entity
    );
    expect(entityCall).toBeUndefined();
  });
});
