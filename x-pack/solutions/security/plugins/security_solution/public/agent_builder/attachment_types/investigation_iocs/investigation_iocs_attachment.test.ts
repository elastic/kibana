/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser/attachments';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { createInvestigationIocsAttachmentDefinition } from './investigation_iocs_attachment';
import { registerInvestigationIocsAttachment } from '../';

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
  type: SecurityAgentBuilderAttachments.investigationIocs,
  data,
});

describe('createInvestigationIocsAttachmentDefinition', () => {
  const definition = createInvestigationIocsAttachmentDefinition();

  it('uses the flag icon', () => {
    expect(definition.getIcon()).toBe('flag');
  });

  it('returns default label when attachmentLabel is absent', () => {
    expect(definition.getLabel(makeAttachment({}))).toBe('Indicators of compromise');
  });

  it('returns attachmentLabel from data when provided', () => {
    expect(definition.getLabel(makeAttachment({ attachmentLabel: 'Custom label' }))).toBe(
      'Custom label'
    );
  });

  it('registers an inline renderer', () => {
    expect(typeof definition.renderInlineContent).toBe('function');
  });
});

describe('registerInvestigationIocsAttachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not register when endpointForensicAnalysisSkill is disabled', () => {
    registerInvestigationIocsAttachment({
      attachments: mockAttachments,
      experimentalFeatures: makeExperimentalFeatures(),
    });

    expect(mockAddAttachmentType).not.toHaveBeenCalled();
  });
});
