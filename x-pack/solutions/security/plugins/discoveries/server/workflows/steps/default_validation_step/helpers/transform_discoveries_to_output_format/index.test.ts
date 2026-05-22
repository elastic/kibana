/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformDiscoveriesToOutputFormat } from '.';

const mockUuid = 'mock-generated-uuid';
jest.mock('uuid', () => ({
  v4: () => mockUuid,
}));

describe('transformDiscoveriesToOutputFormat', () => {
  const baseParams = {
    connectorId: 'connector-1',
    connectorName: 'Test Connector',
    generationUuid: 'generation-1',
  };

  const discoveryWithAllFields = {
    alert_ids: ['alert-1', 'alert-2'],
    details_markdown: 'Details about the attack',
    entity_summary_markdown: 'Entity summary',
    id: 'existing-id',
    mitre_attack_tactics: ['Initial Access', 'Persistence'],
    summary_markdown: 'Summary of the attack',
    timestamp: '2025-06-15T10:00:00.000Z',
    title: 'Test Attack Discovery',
  };

  const discoveryMinimal = {
    alert_ids: ['alert-3'],
    details_markdown: 'Minimal details',
    summary_markdown: 'Minimal summary',
    title: 'Minimal Discovery',
  };

  it('returns an empty array when given no discoveries', () => {
    const result = transformDiscoveriesToOutputFormat({
      ...baseParams,
      attackDiscoveries: [],
    });

    expect(result).toEqual([]);
  });

  it('maps all fields from a fully-populated discovery', () => {
    const result = transformDiscoveriesToOutputFormat({
      ...baseParams,
      attackDiscoveries: [discoveryWithAllFields],
      replacements: { 'uuid-1': 'original-value' },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      alert_ids: ['alert-1', 'alert-2'],
      connector_id: 'connector-1',
      connector_name: 'Test Connector',
      details_markdown: 'Details about the attack',
      entity_summary_markdown: 'Entity summary',
      generation_uuid: 'generation-1',
      id: 'existing-id',
      mitre_attack_tactics: ['Initial Access', 'Persistence'],
      replacements: { 'uuid-1': 'original-value' },
      summary_markdown: 'Summary of the attack',
      timestamp: '2025-06-15T10:00:00.000Z',
      title: 'Test Attack Discovery',
    });
  });

  it('generates a UUID when the discovery has no id', () => {
    const result = transformDiscoveriesToOutputFormat({
      ...baseParams,
      attackDiscoveries: [discoveryMinimal],
    });

    expect(result[0].id).toBe(mockUuid);
  });

  it('uses the discovery id when present', () => {
    const result = transformDiscoveriesToOutputFormat({
      ...baseParams,
      attackDiscoveries: [discoveryWithAllFields],
    });

    expect(result[0].id).toBe('existing-id');
  });

  it('generates a timestamp when the discovery has no timestamp', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-07-01T12:00:00.000Z'));

    const result = transformDiscoveriesToOutputFormat({
      ...baseParams,
      attackDiscoveries: [discoveryMinimal],
    });

    expect(result[0].timestamp).toBe('2025-07-01T12:00:00.000Z');

    jest.useRealTimers();
  });

  it('uses the discovery timestamp when present', () => {
    const result = transformDiscoveriesToOutputFormat({
      ...baseParams,
      attackDiscoveries: [discoveryWithAllFields],
    });

    expect(result[0].timestamp).toBe('2025-06-15T10:00:00.000Z');
  });

  it('omits optional fields that are not present in the discovery', () => {
    const result = transformDiscoveriesToOutputFormat({
      ...baseParams,
      attackDiscoveries: [discoveryMinimal],
    });

    expect(result[0]).not.toHaveProperty('entity_summary_markdown');
    expect(result[0]).not.toHaveProperty('mitre_attack_tactics');
    expect(result[0]).not.toHaveProperty('replacements');
  });

  it('omits replacements from output when not provided', () => {
    const result = transformDiscoveriesToOutputFormat({
      ...baseParams,
      attackDiscoveries: [discoveryWithAllFields],
    });

    expect(result[0]).not.toHaveProperty('replacements');
  });

  it('transforms multiple discoveries', () => {
    const result = transformDiscoveriesToOutputFormat({
      ...baseParams,
      attackDiscoveries: [discoveryWithAllFields, discoveryMinimal],
      replacements: { key: 'value' },
    });

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Test Attack Discovery');
    expect(result[1].title).toBe('Minimal Discovery');
  });
});
