/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { createSignificantSecurityEventAttachmentDefinition } from './significant_security_event_attachment';
import type { SignificantSecurityEventAttachment } from './types';
import { buildEventLookupEsql, getAlertsIndex } from '../navigation';

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
    status: 'open',
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
      const attachment = { data: { title: 'x' } } as SignificantSecurityEventAttachment;
      expect(definition.getLabel(attachment)).toBe('Significant Security Event');
    });

    it('returns the attachmentLabel override when present', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const attachment = {
        data: { title: 'x', attachmentLabel: 'Custom label' },
      } as SignificantSecurityEventAttachment;
      expect(definition.getLabel(attachment)).toBe('Custom label');
    });
  });

  describe('getIcon', () => {
    it('returns the flag icon', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      expect(definition.getIcon?.()).toBe('flag');
    });
  });

  describe('renderInlineContent', () => {
    it('is defined', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      expect(definition.renderInlineContent).toBeDefined();
    });
  });

  describe('getActionButtons', () => {
    it('prefers Discover for the first event when share is available', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({
        navigation: { ...navigation, share: mockShare },
      });
      const event = {
        event_id: 'evt-1',
        source_index: 'logs-endpoint.events.process-default',
      };
      const attachment = {
        data: {
          ...baseData,
          events: [event],
          alerts: ['alert-1'],
        },
      } as SignificantSecurityEventAttachment;

      const buttons = definition.getActionButtons?.({ attachment } as never) ?? [];
      const expectedEsql = buildEventLookupEsql({
        index: event.source_index,
        eventId: event.event_id,
      });

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Open in Discover');
      expect(buttons[0].icon).toBe('discoverApp');
      expect(buttons[0].type).toBe(ActionButtonType.SECONDARY);
      expect(buttons[0].openInNewTab).toBe(true);
      expect(buttons[0].href).toBe(
        `https://example.test/discover?esql=${encodeURIComponent(expectedEsql)}`
      );
    });

    it('falls back to Security alert-details when there are alerts but no events', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
      const alertId = 'alert-9';
      const attachment = {
        data: {
          ...baseData,
          events: [],
          alerts: [alertId],
        },
      } as SignificantSecurityEventAttachment;

      const buttons = definition.getActionButtons?.({ attachment } as never) ?? [];

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('Open alert');
      expect(buttons[0].icon).toBe('warning');
      expect(buttons[0].type).toBe(ActionButtonType.SECONDARY);
      expect(buttons[0].openInNewTab).toBe(true);
      expect(buttons[0].href).toContain('/app/security/alerts/redirect/');
      expect(buttons[0].href).toContain(alertId);
      expect(buttons[0].href).toContain(`index=${getAlertsIndex('default')}`);
    });

    it('returns no buttons when there are neither events nor alerts', () => {
      const definition = createSignificantSecurityEventAttachmentDefinition({
        navigation: { ...navigation, share: mockShare },
      });
      const attachment = {
        data: { ...baseData, events: [], alerts: [] },
      } as SignificantSecurityEventAttachment;

      expect(definition.getActionButtons?.({ attachment } as never)).toEqual([]);
    });
  });
});
