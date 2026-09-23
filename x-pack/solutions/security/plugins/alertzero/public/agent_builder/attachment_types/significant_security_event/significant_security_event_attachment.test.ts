/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import { createSignificantSecurityEventAttachmentDefinition } from './significant_security_event_attachment';
import type { SignificantSecurityEventAttachment } from './view_model';
import { createMockShare, createMockNavigation } from '../test_utils';

describe('createSignificantSecurityEventAttachmentDefinition', () => {
  const navigation = createMockNavigation();
  const mockShare = createMockShare();

  const baseData = {
    title: 'Suspicious lateral movement',
    severity: 'high' as const,
    confidence: 0.8,
    status: 'open' as const,
    source_watch: 'watch-1',
    capability: 'lateral-movement-detector',
    run_id: 'run-1',
    report_id: 'ti-report-1',
    security_knowledge_indicators: [],
    entities: [],
    timeline: [],
    hypothesis_tested: 'hyp',
    evidence_for: [],
    evidence_against: [],
    evaluation_record_ref: 'eval-1',
  };

  it('renders the default shape from title and subtitle, without header badges', () => {
    const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
    const attachment = { data: baseData } as unknown as SignificantSecurityEventAttachment;

    expect(definition.getLabel(attachment)).toBe('Suspicious lateral movement');
    expect(definition.getIcon?.()).toBe('securitySignalDetected');
    expect(definition.getHeader?.({ attachment } as never)).toEqual({
      icon: 'securitySignalDetected',
      subtitle: 'From ti-report-1 · lateral-movement-detector',
    });
    expect(definition.renderInlineContent).toBeDefined();
  });

  it('overrides the label and leads with the confirmed hit count when hunt_result has hits', () => {
    const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
    const withOverride = {
      data: { ...baseData, attachmentLabel: 'Custom label' },
    } as unknown as SignificantSecurityEventAttachment;
    expect(definition.getLabel(withOverride)).toBe('Custom label');

    const withHits = {
      data: {
        ...baseData,
        hunt_result: {
          has_confirmed_hit: true,
          time_range: { from: '2024-01-01T00:00:00Z', to: '2024-01-02T00:00:00Z' },
          tier1: {
            status: 'environment_hits_found',
            counts: { total_hits: 3, returned_hits: 3, affected_hosts: 1, affected_users: 1 },
            per_index: [],
            resolved_iocs: [],
          },
        },
      },
    } as unknown as SignificantSecurityEventAttachment;
    expect(definition.getLabel(withHits)).toBe('3 hits confirm: Suspicious lateral movement');
  });

  it('falls back to a malformed-payload shape: default label, capability-only subtitle', () => {
    const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
    expect(definition.getLabel({ data: {} } as unknown as SignificantSecurityEventAttachment)).toBe(
      'Significant Security Event'
    );

    const capabilityOnly = {
      data: { source_watch: 'watch-1' },
    } as unknown as SignificantSecurityEventAttachment;
    expect(definition.getHeader?.({ attachment: capabilityOnly } as never)?.subtitle).toBe(
      'watch-1'
    );

    expect(definition.getHeader?.({ attachment: {} as never })).toEqual({
      icon: 'securitySignalDetected',
    });
  });

  it('exits to Discover for events, then alerts, and returns none without either or share', () => {
    const getButtonsWithShare = (data: unknown, share?: SharePluginStart) => {
      const definition = createSignificantSecurityEventAttachmentDefinition({
        navigation: { ...navigation, share },
      });
      return definition.getActionButtons?.({
        attachment: { data } as unknown as SignificantSecurityEventAttachment,
      } as never);
    };
    const getButtons = (data: unknown) => getButtonsWithShare(data, mockShare);

    const eventButtons = getButtons({
      ...baseData,
      events: [
        {
          event_id: 'evt-1',
          source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
        },
        {
          event_id: 'evt-2',
          source_index: '.ds-logs-endpoint.events.network-default-2026.09.22-000001',
        },
      ],
    });
    expect(eventButtons).toHaveLength(1);
    expect(eventButtons?.[0].label).toBe('Open events in Discover');
    expect(decodeURIComponent(eventButtons?.[0].href ?? '')).toContain(
      'FROM ".ds-logs-endpoint.events.process-default-2026.09.22-000001", ' +
        '".ds-logs-endpoint.events.network-default-2026.09.22-000001" ' +
        'METADATA _id, _index | WHERE (_index == ".ds-logs-endpoint.events.process-default-2026.09.22-000001" AND ' +
        '(_id IN ("evt-1"))) OR (_index == ".ds-logs-endpoint.events.network-default-2026.09.22-000001" AND (_id IN ("evt-2")))'
    );

    const alertButtons = getButtons({
      ...baseData,
      alerts: [{ alert_id: 'alert-1', index: '.alerts-security.alerts-default' }],
    });
    expect(alertButtons).toHaveLength(1);
    expect(alertButtons?.[0].label).toBe('Open alerts in Discover');
    expect(decodeURIComponent(alertButtons?.[0].href ?? '')).toContain(
      'kibana.alert.uuid IN ("alert-1")'
    );

    expect(getButtons(baseData)).toEqual([]);
    expect(
      getButtonsWithShare({
        ...baseData,
        events: [{ event_id: 'evt-1', source_index: '.ds-logs-default-2026.09.22-000001' }],
      })
    ).toEqual([]);
    expect(getButtons({ severity: 'high' })).toEqual([]);
  });

  it('falls back to the empty state for a non-object payload instead of throwing', () => {
    const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
    // Persisted attachment data is `unknown` at runtime. A truthy JSON primitive must not
    // reach `WeakMap.set`, which only accepts object keys.
    const attachment = { data: 'a-string' } as unknown as SignificantSecurityEventAttachment;

    expect(() => definition.getLabel(attachment)).not.toThrow();
    expect(definition.getLabel(attachment)).toBe('Significant Security Event');
    expect(() => definition.getHeader?.({ attachment } as never)).not.toThrow();
    expect(definition.getActionButtons?.({ attachment } as never)).toEqual([]);
  });
});
