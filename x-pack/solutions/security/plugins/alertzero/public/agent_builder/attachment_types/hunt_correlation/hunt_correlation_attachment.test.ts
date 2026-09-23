/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { createHuntCorrelationAttachmentDefinition } from './hunt_correlation_attachment';
import type { HuntCorrelationAttachment } from './view_model';
import { buildThreatReportsInEsql } from '../navigation';
import { createMockShare, createMockNavigation } from '../test_utils';

describe('createHuntCorrelationAttachmentDefinition', () => {
  const navigation = createMockNavigation();
  const withShare = { ...navigation, share: createMockShare() };

  const baseData: HuntCorrelationAttachment['data'] = {
    anchors: [{ kind: 'hash', value: 'abc123' }],
    diamond_scores: [
      { vertex: 'infrastructure', related_report_id: 'report-2', score: 0.75 },
      { vertex: 'adversary', related_report_id: 'report-3', score: 0.8 },
      { vertex: 'capability', related_report_id: 'report-2', score: 0.5 },
    ],
    thresholds: { anchor_match: 0.9, diamond_vertex: 0.6 },
    self_match_excluded: true,
  };

  it('renders the default shape with a pluralized subtitle and no header badges', () => {
    const definition = createHuntCorrelationAttachmentDefinition({ navigation });
    const attachment = { data: baseData } as unknown as HuntCorrelationAttachment;

    expect(definition.getLabel(attachment)).toBe('Hunt Correlation');
    expect(definition.getIcon?.()).toBe('link');
    expect(definition.getHeader?.({ attachment } as never)).toEqual({
      icon: 'link',
      subtitle: '1 anchor · 2 related reports',
    });
    expect(definition.renderInlineContent).toBeDefined();
  });

  it('overrides the label and keeps the header free of threshold badges', () => {
    const definition = createHuntCorrelationAttachmentDefinition({ navigation });
    const singularData = {
      ...baseData,
      attachmentLabel: 'Custom label',
      diamond_scores: [
        { vertex: 'infrastructure' as const, related_report_id: 'report-2', score: 0.7 },
        { vertex: 'adversary' as const, related_report_id: 'report-3', score: 0.9 },
      ],
    };
    const attachment = { data: singularData } as unknown as HuntCorrelationAttachment;

    expect(definition.getLabel(attachment)).toBe('Custom label');
    expect(definition.getHeader?.({ attachment } as never)).toEqual({
      icon: 'link',
      subtitle: '1 anchor · 2 related reports',
    });
  });

  it('never adds header badges, even without diamond scores', () => {
    const definition = createHuntCorrelationAttachmentDefinition({ navigation });
    const attachment = {
      data: { ...baseData, diamond_scores: [] },
    } as unknown as HuntCorrelationAttachment;

    expect(definition.getHeader?.({ attachment } as never)?.badges).toBeUndefined();
  });

  it('returns Open related reports in Discover for unique report ids when share is available', () => {
    const definition = createHuntCorrelationAttachmentDefinition({ navigation: withShare });
    const attachment = { data: baseData } as unknown as HuntCorrelationAttachment;
    const expectedEsql = buildThreatReportsInEsql({
      reportIds: ['report-2', 'report-3', 'report-2'],
      spaceId: 'default',
    });

    expect(definition.getActionButtons?.({ attachment } as never)).toEqual([
      expect.objectContaining({
        label: 'Open related reports in Discover',
        icon: 'discoverApp',
        type: ActionButtonType.SECONDARY,
        openInNewTab: true,
        href: `https://example.test/discover?esql=${encodeURIComponent(expectedEsql as string)}`,
      }),
    ]);
  });

  it('returns no action buttons without share or without related report ids', () => {
    const definition = createHuntCorrelationAttachmentDefinition({ navigation });
    const attachment = { data: baseData } as unknown as HuntCorrelationAttachment;
    expect(definition.getActionButtons?.({ attachment } as never)).toEqual([]);

    const definitionWithShare = createHuntCorrelationAttachmentDefinition({
      navigation: withShare,
    });
    const noReports = {
      data: { ...baseData, diamond_scores: [] },
    } as unknown as HuntCorrelationAttachment;
    expect(definitionWithShare.getActionButtons?.({ attachment: noReports } as never)).toEqual([]);
  });
});
