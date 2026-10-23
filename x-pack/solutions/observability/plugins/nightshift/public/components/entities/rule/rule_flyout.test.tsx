/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import type { FlyoutTemplateProps } from '@kbn/flyout-template';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { DetectionRule } from '../../../data/rules/use_detection_rules';
import { RuleFlyout } from './rule_flyout';

let mockProps: FlyoutTemplateProps | undefined;
jest.mock('@kbn/flyout-template', () => {
  const actual = jest.requireActual<typeof import('@kbn/flyout-template')>('@kbn/flyout-template');
  const react = jest.requireActual<typeof import('react')>('react');
  const Capture = (props: FlyoutTemplateProps) => {
    mockProps = props;
    return react.createElement(actual.FlyoutTemplate, props);
  };
  return { ...actual, FlyoutTemplate: Object.assign(Capture, actual.FlyoutTemplate) };
});
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
}));
jest.mock('../../ui/spark_plot', () => ({
  SparkPlot: () => <div data-test-subj="sparkPlotStub" />,
}));
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: { toasts: { addSuccess: jest.fn() } },
      share: { url: { locators: { get: () => ({ getRedirectUrl: () => '/app/discover' }) } } },
    },
  }),
}));

const rule = {
  query: {
    id: 'q1',
    type: 'match',
    title: 'Error rate',
    description: 'Errors',
    esql: { query: 'FROM logs-*' },
    severity_score: 80,
  },
  sourceId: 'logs',
  occurrences: [],
  matches: 0,
  status: { state: 'active' },
} as DetectionRule;

const renderFlyout = (canManage: boolean, blocksActivity = false) => {
  mockProps = undefined;
  render(
    <I18nProvider>
      <EuiProvider>
        <RuleFlyout
          rule={rule}
          timeRange={{ from: 'now-24h', to: 'now' }}
          getSourceTitle={() => 'Logs'}
          canManage={canManage}
          blocksActivity={blocksActivity}
          onClose={jest.fn()}
          onDeleteRequest={jest.fn()}
        />
      </EuiProvider>
    </I18nProvider>
  );
};

describe('RuleFlyout actions', () => {
  it('has no delete action for a read-only user', () => {
    renderFlyout(false);
    expect(screen.getByTestId('nightshiftRuleFlyout')).toBeInTheDocument();
    expect(mockProps?.children).toBeDefined();
    expect(screen.queryByText('Delete rule')).not.toBeInTheDocument();
  });

  it('shows delete for a manager', () => {
    renderFlyout(true);
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByText('Delete rule')).toBeInTheDocument();
  });

  it('disables delete while activity is blocked', () => {
    renderFlyout(true, true);
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByText('Delete rule').closest('button')).toBeDisabled();
  });
});
