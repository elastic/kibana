/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { createInvestigationIocsAttachmentDefinition } from './investigation_iocs_attachment';
import type { InvestigationIocsAttachment, InvestigationIocsAttachmentData } from './types';

const makeAttachment = (data: InvestigationIocsAttachmentData): InvestigationIocsAttachment => ({
  id: 'test',
  type: SecurityAgentBuilderAttachments.investigationIocs,
  data,
});

describe('createInvestigationIocsAttachmentDefinition', () => {
  const definition = createInvestigationIocsAttachmentDefinition();

  it('uses the flag icon', () => {
    expect(definition.getIcon?.()).toBe('flag');
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
