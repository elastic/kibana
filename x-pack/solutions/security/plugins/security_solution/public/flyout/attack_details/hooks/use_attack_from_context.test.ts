/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAttackFromContext } from './use_attack_from_context';
import { useAttackDetailsContext } from '../context';

jest.mock('../context', () => ({
  useAttackDetailsContext: jest.fn(),
}));

describe('useAttackFromContext', () => {
  const getFieldsDataMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      attackId: 'attack-1',
      getFieldsData: getFieldsDataMock,
    });
  });

  it('returns AttackDiscoveryAlert when all required fields are present', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      const data: Record<string, unknown> = {
        'kibana.alert.attack_discovery.title': 'Test attack',
        'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'],
        'kibana.alert.attack_discovery.replacements': {},
        'kibana.alert.attack_discovery.summary_markdown': 'Summary',
        'kibana.alert.attack_discovery.details_markdown': 'Details',
        'kibana.alert.attack_discovery.api_config.connector_id': 'connector-1',
        'kibana.alert.attack_discovery.api_config.name': 'My Connector',
        'kibana.alert.rule.execution.uuid': 'gen-uuid-1',
        'kibana.alert.workflow_status': 'open',
        '@timestamp': '2025-01-01T00:00:00Z',
      };
      return data[field] ?? null;
    });

    const { result } = renderHook(() => useAttackFromContext());

    expect(result.current).not.toBeNull();
    expect(result.current?.id).toBe('attack-1');
    expect(result.current?.title).toBe('Test attack');
    expect(result.current?.alertIds).toEqual(['alert-1', 'alert-2']);
    expect(result.current?.connectorId).toBe('connector-1');
    expect(result.current?.connectorName).toBe('My Connector');
    expect(result.current?.generationUuid).toBe('gen-uuid-1');
    expect(result.current?.summaryMarkdown).toBe('Summary');
    expect(result.current?.detailsMarkdown).toBe('Details');
    expect(result.current?.timestamp).toBe('2025-01-01T00:00:00Z');
    expect(result.current?.alertWorkflowStatus).toBe('open');
  });

  it('returns null when attackId is missing', () => {
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      attackId: '',
      getFieldsData: getFieldsDataMock,
    });
    getFieldsDataMock.mockReturnValue('value');

    const { result } = renderHook(() => useAttackFromContext());

    expect(result.current).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.summary_markdown') {
        return null;
      }
      return field.includes('title') ? 'Title' : 'value';
    });

    const { result } = renderHook(() => useAttackFromContext());

    expect(result.current).toBeNull();
  });

  it('returns null when summary_markdown is empty', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.summary_markdown') {
        return '';
      }
      return field.includes('title') ? 'Title' : 'value';
    });

    const { result } = renderHook(() => useAttackFromContext());

    expect(result.current).toBeNull();
  });
});
