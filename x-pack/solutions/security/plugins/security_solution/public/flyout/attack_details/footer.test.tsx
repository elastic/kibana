/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import type { AttackDetailsContext as AttackDetailsContextType } from './context';
import { PanelFooter } from './footer';
import { AttackDetailsContext } from './context';
import {
  FLYOUT_FOOTER_TEST_ID,
  FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID,
} from './constants/test_ids';

const createGetFieldsData = (overrides: Partial<Record<string, unknown>> = {}) => {
  const defaults: Record<string, unknown> = {
    'kibana.alert.attack_discovery.title': 'Test attack',
    'kibana.alert.attack_discovery.alert_ids': ['alert-1'],
    'kibana.alert.attack_discovery.replacements': {},
    'kibana.alert.attack_discovery.summary_markdown': 'Summary',
    'kibana.alert.attack_discovery.details_markdown': 'Details',
    'kibana.alert.attack_discovery.api_config.connector_id': 'connector-1',
    'kibana.alert.attack_discovery.api_config.name': 'My Connector',
    'kibana.alert.rule.execution.uuid': 'gen-uuid-1',
    'kibana.alert.workflow_status': 'open',
    '@timestamp': '2025-01-01T00:00:00Z',
  };
  const data = { ...defaults, ...overrides };
  return (field: string) => data[field] ?? null;
};

const mockContextValue = (getFieldsData: ReturnType<typeof createGetFieldsData>) =>
  ({
    attackId: 'attack-1',
    indexName: '.alerts-default',
    getFieldsData,
    browserFields: {},
    dataFormattedForFieldBrowser: [],
    searchHit: {},
    refetch: jest.fn(),
  } as unknown as React.ComponentProps<typeof AttackDetailsContext.Provider>['value']);

const renderFooter = (
  getFieldsData: ReturnType<typeof createGetFieldsData> = createGetFieldsData()
) =>
  render(
    <TestProviders>
      <AttackDetailsContext.Provider value={mockContextValue(getFieldsData)}>
        <PanelFooter />
      </AttackDetailsContext.Provider>
    </TestProviders>
  );

describe('PanelFooter', () => {
  it('renders the footer with Take Action button when attack can be built from context', () => {
    renderFooter();

    expect(screen.getByTestId(FLYOUT_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take action' })).toBeInTheDocument();
  });

  it('does not render the Take Action button when a required field is missing', () => {
    renderFooter(
      createGetFieldsData({
        'kibana.alert.attack_discovery.summary_markdown': null,
      })
    );

    expect(screen.getByTestId(FLYOUT_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('does not render the Take Action button when attackId is missing', () => {
    const getFieldsData = createGetFieldsData();
    const contextWithoutAttackId: AttackDetailsContextType = {
      ...mockContextValue(getFieldsData),
      attackId: '',
      indexName: '.alerts-default',
    } as AttackDetailsContextType;

    render(
      <TestProviders>
        <AttackDetailsContext.Provider value={contextWithoutAttackId}>
          <PanelFooter />
        </AttackDetailsContext.Provider>
      </TestProviders>
    );

    expect(screen.getByTestId(FLYOUT_FOOTER_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
