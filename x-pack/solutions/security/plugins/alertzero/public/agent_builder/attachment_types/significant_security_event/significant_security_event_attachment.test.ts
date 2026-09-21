/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import { createSignificantSecurityEventAttachmentDefinition } from './significant_security_event_attachment';
import type { SignificantSecurityEventAttachment } from './types';

describe('createSignificantSecurityEventAttachmentDefinition', () => {
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

  const baseData = {
    title: 'Suspicious lateral movement',
    severity: 'high' as const,
    confidence: 0.8,
    status: 'open' as const,
    source_watch: 'watch-1',
    capability: 'lateral-movement-detector',
    run_id: 'run-1',
    security_knowledge_indicators: [],
    entities: [],
    timeline: [],
    hypothesis_tested: 'hyp',
    evidence_for: [],
    evidence_against: [],
    evaluation_record_ref: 'eval-1',
  };

  describe('getLabel', () => {
    it('returns the default label when no attachmentLabel is set', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const attachment = { data: { title: 'x' } } as unknown as SignificantSecurityEventAttachment;
      expect(definition.getLabel(attachment)).toBe('Significant Security Event');
    });

    it('returns the attachmentLabel override when present', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const attachment = {
        data: { title: 'x', attachmentLabel: 'Custom label' },
      } as unknown as SignificantSecurityEventAttachment;
      expect(definition.getLabel(attachment)).toBe('Custom label');
    });
  });

  describe('getIcon', () => {
    it('returns the flag icon', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      expect(definition.getIcon?.()).toBe('flag');
    });
  });

  describe('getHeader', () => {
    it('returns the flag icon for the attachment chrome header', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      expect(definition.getHeader?.({ attachment: {} as never })).toEqual({ icon: 'flag' });
    });
  });

  describe('renderInlineContent', () => {
    it('is defined', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      expect(definition.renderInlineContent).toBeDefined();
    });
  });

  describe('getActionButtons', () => {
    const getButtonsWithShare = (data: unknown, share?: SharePluginStart) => {
      const definition = createSignificantSecurityEventAttachmentDefinition({
        navigation: { ...navigation, share },
      });
      return definition.getActionButtons?.({
        attachment: { data } as unknown as SignificantSecurityEventAttachment,
      } as never);
    };

    const getButtons = (data: unknown) => getButtonsWithShare(data, mockShare);

    it('opens every event across its indices in one Discover query', () => {
      const buttons = getButtons({
        ...baseData,
        events: [
          { event_id: 'evt-1', source_index: 'logs-endpoint.events.process-default' },
          { event_id: 'evt-2', source_index: 'logs-endpoint.events.network-default' },
          { event_id: 'evt-1', source_index: 'logs-endpoint.events.process-default' },
        ],
      });

      expect(buttons).toHaveLength(1);
      expect(buttons?.[0].label).toBe('Open events in Discover');
      expect(decodeURIComponent(buttons?.[0].href ?? '')).toContain(
        'FROM "logs-endpoint.events.process-default", "logs-endpoint.events.network-default" ' +
          'METADATA _id | WHERE event.id IN ("evt-1", "evt-2") OR _id IN ("evt-1", "evt-2")'
      );
    });

    it('falls back to the alerts exit when the event carries no events', () => {
      const buttons = getButtons({
        ...baseData,
        alerts: [{ alert_id: 'alert-1', index: '.alerts-security.alerts-default' }],
      });

      expect(buttons).toHaveLength(1);
      expect(buttons?.[0].label).toBe('Open alerts in Discover');
      expect(decodeURIComponent(buttons?.[0].href ?? '')).toContain(
        'kibana.alert.uuid IN ("alert-1")'
      );
    });

    it('returns no buttons when the event references neither events nor alerts', () => {
      expect(getButtons(baseData)).toEqual([]);
    });

    it('returns no buttons when share is unavailable', () => {
      const buttons = getButtonsWithShare({
        ...baseData,
        events: [{ event_id: 'evt-1', source_index: 'logs-default' }],
      });

      expect(buttons).toEqual([]);
    });

    it('returns no buttons for a malformed payload', () => {
      expect(getButtons({ severity: 'high' })).toEqual([]);
    });
  });
});
