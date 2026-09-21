/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { createHuntCorrelationAttachmentDefinition } from './hunt_correlation_attachment';
import type { HuntCorrelationAttachment } from './types';
import { buildThreatReportsInEsql } from '../navigation';

describe('createHuntCorrelationAttachmentDefinition', () => {
  const navigation = { spaceId: 'default', prependPath: (path: string) => path };

  const mockShare = {
    url: {
      locators: {
        get: () => ({
          getRedirectUrl: ({ query }: { query: { esql: string } }) =>
            `https://example.test/discover?esql=${encodeURIComponent(query.esql)}`,
        }),
      },
    },
  } as unknown as SharePluginStart;

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

  describe('getLabel', () => {
    it('returns the default label when no attachmentLabel is set', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      const attachment = { data: { anchors: [] } } as unknown as HuntCorrelationAttachment;
      expect(definition.getLabel(attachment)).toBe('Hunt Correlation');
    });

    it('returns the attachmentLabel override when present', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      const attachment = {
        data: { anchors: [], attachmentLabel: 'Custom label' },
      } as unknown as HuntCorrelationAttachment;
      expect(definition.getLabel(attachment)).toBe('Custom label');
    });
  });

  describe('getIcon', () => {
    it('returns the link icon', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      expect(definition.getIcon?.()).toBe('link');
    });
  });

  describe('getHeader', () => {
    it('returns the link icon and a pluralized anchor/report subtitle', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      const attachment = { data: baseData } as unknown as HuntCorrelationAttachment;
      const header = definition.getHeader?.({ attachment } as never);
      expect(header?.icon).toBe('link');
      expect(header?.subtitle).toBe('1 anchor · 2 related reports');
    });

    it('uses singular grammar for exactly one anchor and one related report', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      const attachment = {
        data: {
          ...baseData,
          diamond_scores: [
            { vertex: 'infrastructure' as const, related_report_id: 'report-2', score: 0.75 },
          ],
        },
      } as unknown as HuntCorrelationAttachment;
      const header = definition.getHeader?.({ attachment } as never);
      expect(header?.subtitle).toBe('1 anchor · 1 related report');
    });

    it('badges "Above threshold" (success) when every diamond score meets the threshold', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      const attachment = {
        data: {
          ...baseData,
          diamond_scores: [
            { vertex: 'infrastructure' as const, related_report_id: 'report-2', score: 0.7 },
            { vertex: 'adversary' as const, related_report_id: 'report-3', score: 0.9 },
          ],
        },
      } as unknown as HuntCorrelationAttachment;
      const header = definition.getHeader?.({ attachment } as never);
      expect(header?.badges).toEqual([{ label: 'Above threshold', color: 'success' }]);
    });

    it('badges "Below threshold" (hollow) when any diamond score misses the threshold', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      const attachment = { data: baseData } as unknown as HuntCorrelationAttachment;
      const header = definition.getHeader?.({ attachment } as never);
      expect(header?.badges).toEqual([{ label: 'Below threshold', color: 'hollow' }]);
    });

    it('omits the badge entirely when there are no diamond scores', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      const attachment = {
        data: { ...baseData, diamond_scores: [] },
      } as unknown as HuntCorrelationAttachment;
      const header = definition.getHeader?.({ attachment } as never);
      expect(header?.badges).toEqual([]);
    });
  });

  describe('renderInlineContent', () => {
    it('is defined', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      expect(definition.renderInlineContent).toBeDefined();
    });
  });

  describe('getActionButtons', () => {
    it('returns Open related reports in Discover for unique report ids when share is available', () => {
      const definition = createHuntCorrelationAttachmentDefinition({
        navigation: { ...navigation, share: mockShare },
      });
      const attachment = { data: baseData } as unknown as HuntCorrelationAttachment;
      const expectedEsql = buildThreatReportsInEsql({
        reportIds: ['report-2', 'report-3', 'report-2'],
      });

      const buttons = definition.getActionButtons?.({ attachment } as never) ?? [];

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Open related reports in Discover');
      expect(buttons[0].icon).toBe('discoverApp');
      expect(buttons[0].type).toBe(ActionButtonType.SECONDARY);
      expect(buttons[0].openInNewTab).toBe(true);
      expect(buttons[0].href).toBe(
        `https://example.test/discover?esql=${encodeURIComponent(expectedEsql as string)}`
      );
    });

    it('returns no buttons when share is undefined', () => {
      const definition = createHuntCorrelationAttachmentDefinition({ navigation });
      const attachment = { data: baseData } as unknown as HuntCorrelationAttachment;

      expect(definition.getActionButtons?.({ attachment } as never)).toEqual([]);
    });

    it('returns no buttons when there are no related report ids', () => {
      const definition = createHuntCorrelationAttachmentDefinition({
        navigation: { ...navigation, share: mockShare },
      });
      const attachment = {
        data: { ...baseData, diamond_scores: [] },
      } as unknown as HuntCorrelationAttachment;

      expect(definition.getActionButtons?.({ attachment } as never)).toEqual([]);
    });
  });
});
