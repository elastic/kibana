/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { createImpactAttachmentDefinition } from './impact_attachment';
import type { ImpactAttachment, ImpactAttachmentData } from './types';

const makeAttachment = (data: Partial<ImpactAttachmentData>): ImpactAttachment => ({
  id: 'test',
  type: SecurityAgentBuilderAttachments.impact,
  data: { entities: [], ...data },
});

const hostEntity = {
  entity_type: 'host' as const,
  name: 'WKSTN-01',
  alert_count: 3,
  verdicts: { true_positive: 2, false_positive: 1, inconclusive: 0 },
};

describe('createImpactAttachmentDefinition', () => {
  const definition = createImpactAttachmentDefinition();

  it('uses the alert icon', () => {
    expect(definition.getIcon?.()).toBe('alert');
  });

  it('returns default label when data is empty', () => {
    expect(definition.getLabel(makeAttachment({}))).toBe('Alert impact');
  });

  it('returns default label when entities list is empty', () => {
    expect(definition.getLabel(makeAttachment({ entities: [] }))).toBe('Alert impact');
  });

  it('returns attachmentLabel from data when provided', () => {
    expect(
      definition.getLabel(
        makeAttachment({ attachmentLabel: 'My custom label', entities: [hostEntity] })
      )
    ).toBe('My custom label');
  });

  it('builds "Impact — N host(s)" label from entity counts', () => {
    expect(definition.getLabel(makeAttachment({ entities: [hostEntity] }))).toBe('Impact — 1 host');
    expect(
      definition.getLabel(
        makeAttachment({ entities: [hostEntity, { ...hostEntity, name: 'WKSTN-02' }] })
      )
    ).toBe('Impact — 2 hosts');
  });

  it('builds "Impact — N user(s)" label for user entities', () => {
    expect(
      definition.getLabel(
        makeAttachment({
          entities: [
            {
              entity_type: 'user',
              name: 'jdoe',
              alert_count: 1,
              verdicts: { true_positive: 1, false_positive: 0, inconclusive: 0 },
            },
          ],
        })
      )
    ).toBe('Impact — 1 user');
  });

  it('combines hosts and users in the label', () => {
    const label = definition.getLabel(
      makeAttachment({
        entities: [
          hostEntity,
          {
            entity_type: 'user',
            name: 'jdoe',
            alert_count: 1,
            verdicts: { true_positive: 1, false_positive: 0, inconclusive: 0 },
          },
        ],
      })
    );
    expect(label).toBe('Impact — 1 host, 1 user');
  });

  it('registers an inline renderer', () => {
    expect(typeof definition.renderInlineContent).toBe('function');
  });
});
