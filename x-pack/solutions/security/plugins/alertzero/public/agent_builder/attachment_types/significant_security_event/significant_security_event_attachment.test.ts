/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import { createSignificantSecurityEventAttachmentDefinition } from './significant_security_event_attachment';
import type { SignificantSecurityEventAttachment } from './view_model';
import {
  buildSignificantSecurityEventHeadline,
  parseSignificantSecurityEventData,
  toSseViewModel,
} from './view_model';
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

  it('renders the default shape from subtitle, without severity badges in the chrome header', () => {
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

  it('uses the hit-centric summary as the chrome title so it matches the inline headline', () => {
    const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
    const withSummary = {
      data: {
        ...baseData,
        summary: 'ip 127.0.0.1 seen 4912x on 8 hosts',
        basis: 'ioc_weak',
        hunt_result: {
          has_confirmed_hit: true,
          hit_sources: ['tier1'],
          time_range: { from: '2024-01-01T00:00:00Z', to: '2024-01-02T00:00:00Z' },
          tier1: {
            status: 'environment_hits_found',
            counts: { total_hits: 4912, returned_hits: 100, affected_hosts: 8, affected_users: 5 },
            per_index: [],
            resolved_iocs: [{ type: 'ip', value: '127.0.0.1' }],
          },
        },
      },
    } as unknown as SignificantSecurityEventAttachment;

    const parsed = parseSignificantSecurityEventData(withSummary.data);
    expect(parsed).toBeDefined();
    const headline = buildSignificantSecurityEventHeadline(parsed, withSummary.data);
    expect(definition.getLabel(withSummary)).toBe(headline.title);
    expect(definition.getLabel(withSummary)).toBe('ip 127.0.0.1 seen 4912x on 8 hosts');

    const header = definition.getHeader?.({ attachment: withSummary } as never);
    expect(header?.badges).toEqual([{ label: 'Weak IOC', color: 'hollow' }]);
  });

  it('falls back to attachmentLabel / title when the payload does not parse', () => {
    const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
    const withOverride = {
      data: { ...baseData, attachmentLabel: 'Custom label', title: { bad: 'object' } },
    } as unknown as SignificantSecurityEventAttachment;
    // title is invalid so the whole payload fails schema parse; attachmentLabel is read unparsed.
    expect(definition.getLabel(withOverride)).toBe('Custom label');
  });

  it('derives the chrome title from an old payload the same way the inline card does', () => {
    const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
    const oldPayload = {
      data: {
        ...baseData,
        events: [
          {
            event_id: 'evt-1',
            source_index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
            matched: {
              ioc: { type: 'ip', value: '127.0.0.1' },
              field: 'source.ip',
            },
          },
        ],
        hunt_result: {
          has_confirmed_hit: true,
          hit_sources: ['tier1'],
          time_range: { from: '2024-01-01T00:00:00Z', to: '2024-01-02T00:00:00Z' },
          tier1: {
            status: 'environment_hits_found',
            counts: { total_hits: 12, returned_hits: 12, affected_hosts: 2, affected_users: 1 },
            per_index: [
              {
                index: '.ds-logs-endpoint.events.process-default-2026.09.22-000001',
                hit_count: 12,
                required: true,
              },
            ],
            resolved_iocs: [{ type: 'ip', value: '127.0.0.1' }],
          },
        },
      },
    } as unknown as SignificantSecurityEventAttachment;

    const parsed = parseSignificantSecurityEventData(oldPayload.data);
    expect(parsed).toBeDefined();
    const viewModel = toSseViewModel(parsed!);
    expect(definition.getLabel(oldPayload)).toBe(viewModel.summary);
    expect(viewModel.basis).toBe('ioc_weak');
  });

  it('ignores captured label fields that are not strings', () => {
    const definition = createSignificantSecurityEventAttachmentDefinition({ navigation });
    // A persisted payload can carry a shape this build no longer accepts, and the platform
    // chrome renders this value directly.
    const objectLabel = {
      data: { ...baseData, attachmentLabel: { text: 'nope' }, title: { text: 'also nope' } },
    } as unknown as SignificantSecurityEventAttachment;

    expect(definition.getLabel(objectLabel)).toBe('Significant Security Event');
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
    expect(eventButtons?.[0].label).toBe('Open cited events');
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

    const bothButtons = getButtons({
      ...baseData,
      events: [{ event_id: 'evt-1', source_index: '.ds-logs-default-2026.09.22-000001' }],
      alerts: [{ alert_id: 'alert-1', index: '.alerts-security.alerts-default' }],
    });
    expect(bothButtons).toHaveLength(1);
    expect(bothButtons?.[0].label).toBe('Open cited events');

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
