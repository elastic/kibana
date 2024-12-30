/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LinkToAlertsPage, LinkToAlertsPageProps } from './link_to_alerts_page';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { coreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const useKibanaContextForPluginMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;
jest.mock('../../../../hooks/use_kibana');

describe('LinkToAlertsPage component', () => {
  const mockUseKibana = () => {
    useKibanaContextForPluginMock.mockReturnValue({
      services: {
        ...coreMock.createStart(),
      },
    } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
  };

  beforeEach(() => {
    mockUseKibana();
  });

  it('renders correctly with default props', () => {
    const props: LinkToAlertsPageProps = {
      dateRange: { from: '2024-04-01', to: '2024-04-15' },
      ['data-test-subj']: 'test-link',
    };
    const { container } = render(
      <IntlProvider locale="en">
        <LinkToAlertsPage {...props} />
      </IntlProvider>
    );
    expect(container).toMatchSnapshot();
  });

  it('renders correctly with optional props', () => {
    const props: LinkToAlertsPageProps = {
      dateRange: { from: '2024-04-01', to: '2024-04-15' },
      kuery: 'foo:bar',
      ['data-test-subj']: 'test-link',
    };
    const { container } = render(
      <IntlProvider locale="en">
        <LinkToAlertsPage {...props} />
      </IntlProvider>
    );
    const link = screen.getByTestId('test-link');
    expect(link).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('generates correct link', () => {
    const props: LinkToAlertsPageProps = {
      dateRange: { from: '2024-04-01', to: '2024-04-15' },
      kuery: 'foo:bar',
      ['data-test-subj']: 'test-link',
    };
    render(
      <IntlProvider locale="en">
        <LinkToAlertsPage {...props} />
      </IntlProvider>
    );
    const href = screen.getByRole('link', { name: 'Show all' }).getAttribute('href');
    expect(href).toContain(
      "/app/observability/alerts?_a=(kuery:'foo:bar',rangeFrom:'2024-04-01',rangeTo:'2024-04-15',status:all)"
    );
  });
});
