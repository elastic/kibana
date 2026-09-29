/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { UseQueryResult } from '@kbn/react-query';
import { render } from '@testing-library/react';
import React from 'react';
import { IntegrationsGuard } from './integrations_guard';
import { TestProvidersComponent } from '../mocks/test_providers';
import type { Integration } from '../hooks/use_integrations';
import { useIntegrations } from '../hooks/use_integrations';
import { useIntegrationsPageLink } from '../hooks/use_integrations_page_link';
import { useTIDocumentationLink } from '../hooks/use_documentation_link';
import { useIndicatorsTotalCount } from '../modules/indicators/hooks/use_total_count';
import { INSTALLATION_STATUS, THREAT_INTELLIGENCE_CATEGORY } from '../utils/filter_integrations';
import { EMPTY_PAGE_WRAPPER_TEST_ID, LOADING_LOGO_WRAPPER_TEST_ID } from './test_ids';

vi.mock('../modules/indicators/hooks/use_total_count');
vi.mock('../hooks/use_integrations_page_link');
vi.mock('../hooks/use_documentation_link');
vi.mock('../hooks/use_integrations');
vi.mock('../../app/home/template_wrapper', () => {
      const mocked = {
      SecuritySolutionTemplateWrapper: ({
        'data-test-subj': dataTestSubj,
      }: {
        'data-test-subj'?: string;
      }) => <div data-test-subj={dataTestSubj} />,
    };
      return { ...mocked, default: mocked };
    });

describe('IntegrationsGuard', () => {
  it('should render loading when indicator count and integrations are being loaded', async () => {
    (
      useIndicatorsTotalCount as MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: true,
    });
    (
      useIntegrationsPageLink as MockedFunction<typeof useIntegrationsPageLink>
    ).mockReturnValue('');
    (useTIDocumentationLink as MockedFunction<typeof useTIDocumentationLink>).mockReturnValue(
      ''
    );
    (useIntegrations as MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: true,
      data: [],
    } as unknown as UseQueryResult<Integration[]>);

    const { getByTestId } = render(
      <IntegrationsGuard>{'should be restricted'}</IntegrationsGuard>,
      {
        wrapper: TestProvidersComponent,
      }
    );

    expect(getByTestId(LOADING_LOGO_WRAPPER_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading when indicator only is loading', async () => {
    (
      useIndicatorsTotalCount as MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: true,
    });
    (
      useIntegrationsPageLink as MockedFunction<typeof useIntegrationsPageLink>
    ).mockReturnValue('');
    (useTIDocumentationLink as MockedFunction<typeof useTIDocumentationLink>).mockReturnValue(
      ''
    );
    (useIntegrations as MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: false,
      data: [],
    } as unknown as UseQueryResult<Integration[]>);

    const { getByTestId } = render(
      <IntegrationsGuard>{'should be restricted'}</IntegrationsGuard>,
      {
        wrapper: TestProvidersComponent,
      }
    );

    expect(getByTestId(LOADING_LOGO_WRAPPER_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading when integrations only are loading', async () => {
    (
      useIntegrationsPageLink as MockedFunction<typeof useIntegrationsPageLink>
    ).mockReturnValue('');
    (useTIDocumentationLink as MockedFunction<typeof useTIDocumentationLink>).mockReturnValue(
      ''
    );

    (
      useIndicatorsTotalCount as MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: true,
    });
    (useIntegrations as MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: true,
      data: [],
    } as unknown as UseQueryResult<Integration[]>);

    const { getByTestId } = render(
      <IntegrationsGuard>{'should be restricted'}</IntegrationsGuard>,
      {
        wrapper: TestProvidersComponent,
      }
    );

    expect(getByTestId(LOADING_LOGO_WRAPPER_TEST_ID)).toBeInTheDocument();
  });

  it('should render empty page when no indicators are found and no ti integrations are installed', async () => {
    (
      useIndicatorsTotalCount as MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (
      useIntegrationsPageLink as MockedFunction<typeof useIntegrationsPageLink>
    ).mockReturnValue('');
    (useTIDocumentationLink as MockedFunction<typeof useTIDocumentationLink>).mockReturnValue(
      ''
    );
    (useIntegrations as MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: false,
      data: [],
    } as unknown as UseQueryResult<Integration[]>);

    const { getByTestId } = render(
      <IntegrationsGuard>{'should be restricted'}</IntegrationsGuard>,
      {
        wrapper: TestProvidersComponent,
      }
    );
    expect(getByTestId(EMPTY_PAGE_WRAPPER_TEST_ID)).toBeInTheDocument();
  });

  it('should render indicators table when we have some indicators', async () => {
    (
      useIndicatorsTotalCount as MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 7,
      isLoading: false,
    });
    (useIntegrations as MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: false,
      data: [],
    } as unknown as UseQueryResult<Integration[]>);

    const { asFragment } = render(<IntegrationsGuard>{'should be restricted'}</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        should be restricted
      </DocumentFragment>
    `);
  });

  it('should render indicators page when we have some ti integrations installed', async () => {
    (
      useIndicatorsTotalCount as MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: false,
    });
    (useIntegrations as MockedFunction<typeof useIntegrations>).mockReturnValue({
      isLoading: false,
      data: [
        {
          categories: [THREAT_INTELLIGENCE_CATEGORY],
          id: '123',
          status: INSTALLATION_STATUS.Installed,
        },
      ],
    } as unknown as UseQueryResult<Integration[]>);

    const { asFragment } = render(<IntegrationsGuard>{'should be restricted'}</IntegrationsGuard>, {
      wrapper: TestProvidersComponent,
    });
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        should be restricted
      </DocumentFragment>
    `);
  });
});
