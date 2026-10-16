/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { LogsPageTemplate } from './page_template';

const ONBOARDING_HREF = '/app/observabilityOnboarding?category=logs';
const PAGE_TEST_SUBJ = 'logsAnomaliesPage';

let mockLastPageTemplateProps: {
  'data-test-subj'?: string;
  isEmptyState?: boolean;
  noDataConfig?: NoDataConfig;
} = {};

const mockGetRedirectUrl = jest.fn().mockReturnValue(ONBOARDING_HREF);

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      observabilityAIAssistant: undefined,
      observabilityShared: {
        navigation: {
          PageTemplate: (props: {
            'data-test-subj'?: string;
            isEmptyState?: boolean;
            noDataConfig?: NoDataConfig;
            children?: React.ReactNode;
          }) => {
            mockLastPageTemplateProps = {
              'data-test-subj': props['data-test-subj'],
              isEmptyState: props.isEmptyState,
              noDataConfig: props.noDataConfig,
            };
            return <div data-test-subj={props['data-test-subj']}>{props.children}</div>;
          },
        },
      },
      share: {
        url: {
          locators: {
            get: () => ({ getRedirectUrl: mockGetRedirectUrl }),
          },
        },
      },
      docLinks: { links: { observability: { guide: 'https://docs.example' } } },
    },
  }),
}));

jest.mock('@kbn/shared-ux-page-no-data', () => ({
  NoDataPage: () => <div data-test-subj="logsOnboardingPage">onboarding</div>,
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('LogsPageTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRedirectUrl.mockReturnValue(ONBOARDING_HREF);
    mockLastPageTemplateProps = {};
  });

  it('keeps the header and onboarding card when there is no data', () => {
    renderWithProviders(
      <LogsPageTemplate
        data-test-subj={PAGE_TEST_SUBJ}
        hasData={false}
        header={<div data-test-subj="logsPageHeader">header</div>}
      >
        <div data-test-subj="logsPageBody">body</div>
      </LogsPageTemplate>
    );

    expect(screen.getByTestId('logsPageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('logsOnboardingPage')).toBeInTheDocument();
    expect(screen.queryByTestId('logsPageBody')).not.toBeInTheDocument();
    expect(mockLastPageTemplateProps['data-test-subj']).toBe('noDataPage');
    expect(mockLastPageTemplateProps.noDataConfig).toBeUndefined();
  });

  it('keeps the header and empty-state body when isEmptyState is set', () => {
    renderWithProviders(
      <LogsPageTemplate
        data-test-subj={PAGE_TEST_SUBJ}
        header={<div data-test-subj="logsPageHeader">header</div>}
        isEmptyState
      >
        <div data-test-subj="logsPageBody">empty</div>
      </LogsPageTemplate>
    );

    expect(screen.getByTestId('logsPageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('logsPageBody')).toBeInTheDocument();
    expect(screen.queryByTestId('logsOnboardingPage')).not.toBeInTheDocument();
    expect(mockLastPageTemplateProps.isEmptyState).toBeUndefined();
    expect(mockLastPageTemplateProps.noDataConfig).toBeUndefined();
  });

  it('keeps the header and normal body when there is data', () => {
    renderWithProviders(
      <LogsPageTemplate
        data-test-subj={PAGE_TEST_SUBJ}
        header={<div data-test-subj="logsPageHeader">header</div>}
      >
        <div data-test-subj="logsPageBody">body</div>
      </LogsPageTemplate>
    );

    expect(screen.getByTestId('logsPageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('logsPageBody')).toBeInTheDocument();
    expect(screen.queryByTestId('logsOnboardingPage')).not.toBeInTheDocument();
    expect(mockLastPageTemplateProps['data-test-subj']).toBe(PAGE_TEST_SUBJ);
    expect(mockLastPageTemplateProps.isEmptyState).toBeUndefined();
    expect(mockLastPageTemplateProps.noDataConfig).toBeUndefined();
  });
});
