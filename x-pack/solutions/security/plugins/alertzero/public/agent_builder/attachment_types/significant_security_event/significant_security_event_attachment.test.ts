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
    it('falls back to title when no attachmentLabel is set', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const attachment = { data: { title: 'x' } } as unknown as SignificantSecurityEventAttachment;
      expect(definition.getLabel(attachment)).toBe('x');
    });

    it('returns the default label when neither attachmentLabel nor title is set', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const attachment = { data: {} } as unknown as SignificantSecurityEventAttachment;
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
    it('returns the flag icon and the source watch / capability subtitle without run_id', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const header = definition.getHeader?.({
        attachment: { data: baseData } as unknown as SignificantSecurityEventAttachment,
      } as never);
      expect(header?.icon).toBe('flag');
      expect(header?.subtitle).toBe('watch-1 · lateral-movement-detector');
    });

    it('returns no badges and an empty header for a malformed attachment', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      expect(definition.getHeader?.({ attachment: {} as never })).toEqual({ icon: 'flag' });
    });

    it('renders a severity badge with the severity badge color', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const header = definition.getHeader?.({
        attachment: {
          data: { ...baseData, severity: 'critical' },
        } as unknown as SignificantSecurityEventAttachment,
      } as never);
      expect(header?.badges).toContainEqual({ label: 'critical', color: 'danger' });
    });

    it('renders a status badge with a hollow color', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const header = definition.getHeader?.({
        attachment: {
          data: { ...baseData, status: 'investigating' },
        } as unknown as SignificantSecurityEventAttachment,
      } as never);
      expect(header?.badges).toContainEqual({ label: 'investigating', color: 'hollow' });
    });

    it('renders a confidence badge without the confirmed-hit icon when there is no hunt_result', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const header = definition.getHeader?.({
        attachment: {
          data: { ...baseData, confidence: 0.9 },
        } as unknown as SignificantSecurityEventAttachment,
      } as never);
      expect(header?.badges).toContainEqual({ label: '90%', color: 'hollow' });
    });

    it('renders a confidence badge with the confirmed-hit icon when hunt_result has a confirmed hit', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const header = definition.getHeader?.({
        attachment: {
          data: {
            ...baseData,
            confidence: 0.9,
            hunt_result: {
              has_confirmed_hit: true,
              time_range: { from: '2024-01-01T00:00:00Z', to: '2024-01-02T00:00:00Z' },
              tier1: {
                status: 'environment_hits_found',
                counts: { total_hits: 1, returned_hits: 1, affected_hosts: 1, affected_users: 1 },
                per_index: [],
                resolved_iocs: [],
              },
            },
          },
        } as unknown as SignificantSecurityEventAttachment,
      } as never);
      expect(header?.badges).toContainEqual({
        label: '90%',
        color: 'hollow',
        iconType: 'securitySignalDetected',
      });
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
          'METADATA _id | WHERE _id IN ("evt-1", "evt-2")'
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
