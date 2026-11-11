/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { Header } from './header';
import { mockObservedService } from '../../../../flyout/entity_details/service_right/mocks';
import { RiskSeverity } from '../../../../../common/search_strategy';

const mockProps = {
  serviceName: 'test',
  scopeId: 'test-scope-id',
  lastSeen: mockObservedService.lastSeen,
};

jest.mock('../../../../common/components/visualization_actions/visualization_embeddable');

jest.mock('../../../shared/components/flyout_header_actions', () => ({
  FlyoutHeaderActions: ({ children }: { children?: React.ReactNode }) => (
    <div data-test-subj="mockFlyoutHeaderActions">{children}</div>
  ),
}));

const mockCopyLink = jest.fn((_props: { target: Record<string, unknown> }) => (
  <div data-test-subj="mockCopyLink" />
));
jest.mock('../../shared/components/entity_analytics_flyout_copy_link', () => ({
  EntityAnalyticsFlyoutCopyLink: (props: { target: Record<string, unknown> }) =>
    mockCopyLink(props),
}));

const mockedUseNewEntityAnalyticsPage = jest.fn().mockReturnValue(false);
jest.mock('../../../../entity_analytics/hooks/use_new_entity_analytics_page', () => ({
  useNewEntityAnalyticsPage: () => mockedUseNewEntityAnalyticsPage(),
}));

describe('Header', () => {
  beforeEach(() => {
    mockedUseNewEntityAnalyticsPage.mockReturnValue(false);
  });

  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Header {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header')).toBeInTheDocument();
  });

  it('renders observed badge when lastSeen is defined', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Header {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header-observed-badge')).toBeInTheDocument();
  });

  it('does not render observed badge when lastSeen date is undefined', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <Header {...mockProps} lastSeen={{ isLoading: false, date: undefined }} />
      </TestProviders>
    );

    expect(queryByTestId('service-panel-header-observed-badge')).not.toBeInTheDocument();
  });

  it('renders entity store badge when isEntityInStore is true', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Header {...mockProps} isEntityInStore />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header-observed-badge')).toHaveTextContent('Entity Store');
  });

  it('renders the resolved-from badge in group view on the new entity analytics page', () => {
    mockedUseNewEntityAnalyticsPage.mockReturnValue(true);

    const { getByTestId } = render(
      <TestProviders>
        <Header {...mockProps} isEntityInStore aliasRecords={[{}, {}] as never} aliasCount={2} />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header-observed-badge')).toHaveTextContent(
      'Resolved from 3 records'
    );
  });

  it('renders observed badge text when isEntityInStore is false', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Header {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header-observed-badge')).toHaveTextContent('Observed');
  });

  it('renders risk level badge when isEntityInStore and riskLevel are provided', () => {
    const { getByText } = render(
      <TestProviders>
        <Header {...mockProps} isEntityInStore riskLevel={RiskSeverity.High} />
      </TestProviders>
    );

    expect(getByText('Risk: High')).toBeInTheDocument();
  });

  it('does not render risk level badge when isEntityInStore is false', () => {
    const { queryByText } = render(
      <TestProviders>
        <Header {...mockProps} riskLevel={RiskSeverity.High} />
      </TestProviders>
    );

    expect(queryByText('Risk: High')).not.toBeInTheDocument();
  });

  it('renders the last seen date when the service is not in the entity store', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Header {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header-lastSeen')).toBeInTheDocument();
  });

  it('hides the last seen date when the service is in the entity store', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <Header {...mockProps} isEntityInStore />
      </TestProviders>
    );

    expect(queryByTestId('service-panel-header-lastSeen')).not.toBeInTheDocument();
  });

  it('renders loading skeletons while the last seen date is loading', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <Header {...mockProps} lastSeen={{ date: undefined, isLoading: true }} />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header-lastSeen-loading')).toBeInTheDocument();
    expect(getByTestId('service-panel-header-observed-badge-loading')).toBeInTheDocument();
    expect(queryByTestId('service-panel-header-observed-badge')).not.toBeInTheDocument();
  });

  it('renders the copy link with the service target when enabled', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Header
          {...mockProps}
          entityId="service:nginx"
          mode="resolved"
          showEntityAnalyticsCopyLink
        />
      </TestProviders>
    );

    expect(getByTestId('mockCopyLink')).toBeInTheDocument();
    expect(mockCopyLink).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          kind: 'service',
          serviceName: 'test',
          entityId: 'service:nginx',
          scopeId: 'test-scope-id',
        }),
      })
    );
  });

  it('does not render the copy link by default', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <Header {...mockProps} />
      </TestProviders>
    );

    expect(queryByTestId('mockCopyLink')).not.toBeInTheDocument();
  });
});
