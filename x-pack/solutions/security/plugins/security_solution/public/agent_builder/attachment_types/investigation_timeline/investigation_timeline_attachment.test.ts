/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { createInvestigationTimelineAttachmentDefinition } from './investigation_timeline_attachment';
import type { InvestigationTimelineAttachment, InvestigationTimelineAttachmentData } from './types';

const makeAttachment = (
  data: InvestigationTimelineAttachmentData
): InvestigationTimelineAttachment => ({
  id: 'test',
  type: SecurityAgentBuilderAttachments.investigationTimeline,
  data,
});

describe('createInvestigationTimelineAttachmentDefinition', () => {
  const definition = createInvestigationTimelineAttachmentDefinition();

  it('uses the timeline icon', () => {
    expect(definition.getIcon?.()).toBe('timeline');
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
