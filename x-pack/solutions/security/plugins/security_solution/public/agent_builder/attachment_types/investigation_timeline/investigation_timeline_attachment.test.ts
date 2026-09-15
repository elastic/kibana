/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser/attachments';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { createInvestigationTimelineAttachmentDefinition } from './investigation_timeline_attachment';
import { registerInvestigationTimelineAttachment } from '../';

const makeExperimentalFeatures = (
  overrides: Partial<ExperimentalFeatures> = {}
): ExperimentalFeatures =>
  ({ endpointForensicAnalysisSkill: false, ...overrides } as unknown as ExperimentalFeatures);

const mockAddAttachmentType = jest.fn();
const mockAttachments: AttachmentServiceStartContract = {
  addAttachmentType: mockAddAttachmentType,
} as unknown as AttachmentServiceStartContract;

const makeAttachment = (data: object) => ({
  id: 'test',
  type: SecurityAgentBuilderAttachments.investigationTimeline,
  data,
});

describe('createInvestigationTimelineAttachmentDefinition', () => {
  const definition = createInvestigationTimelineAttachmentDefinition();

  it('uses the timeline icon', () => {
    expect(definition.getIcon()).toBe('timeline');
  });

  it('returns default label when attachmentLabel is absent', () => {
    expect(definition.getLabel(makeAttachment({ events: [] }))).toBe('Attack timeline');
  });

  it('returns attachmentLabel from data when provided', () => {
    expect(
      definition.getLabel(makeAttachment({ events: [], attachmentLabel: 'Custom label' }))
    ).toBe('Custom label');
  });

  it('registers an inline renderer', () => {
    expect(typeof definition.renderInlineContent).toBe('function');
  });
});

describe('registerInvestigationTimelineAttachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not register when endpointForensicAnalysisSkill is disabled', () => {
    registerInvestigationTimelineAttachment({
      attachments: mockAttachments,
      experimentalFeatures: makeExperimentalFeatures(),
    });

    expect(mockAddAttachmentType).not.toHaveBeenCalled();
  });
});
