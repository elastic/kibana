/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { mockTelemetryActions } from '../../../__mocks__/kea_logic';

vi.mock('../../../shared/layout/nav', () => {
  const mocked = {
    useEnterpriseSearchNav: () => [],
  };
  return { ...mocked, default: mocked };
});

// SetEnterpriseSearchContentChrome renders null — mock it to verify trail prop is wired correctly.
vi.mock('../../../shared/kibana_chrome', () => {
  const mocked = {
    SetEnterpriseSearchContentChrome: vi.fn(() => null),
  };
  return { ...mocked, default: mocked };
});

import React from 'react';

import { screen, waitFor } from '@testing-library/react';

import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import { SetEnterpriseSearchContentChrome } from '../../../shared/kibana_chrome';

import { EnterpriseSearchContentPageTemplate } from './page_template';

const MockedSetChrome = vi.mocked(SetEnterpriseSearchContentChrome);

describe('EnterpriseSearchContentPageTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders', () => {
    renderWithKibanaRenderContext(
      <EnterpriseSearchContentPageTemplate>
        <div className="hello">world</div>
      </EnterpriseSearchContentPageTemplate>
    );

    expect(screen.getByText('world')).toBeInTheDocument();
  });

  describe('page chrome', () => {
    it('takes a breadcrumb array & renders a product-specific page chrome', () => {
      renderWithKibanaRenderContext(
        <EnterpriseSearchContentPageTemplate pageChrome={['Some page']} />
      );

      expect(MockedSetChrome).toHaveBeenCalledWith(
        expect.objectContaining({ trail: ['Some page'] }),
        expect.anything()
      );
    });
  });

  describe('page telemetry', () => {
    it('takes a metric & renders product-specific telemetry viewed event', async () => {
      renderWithKibanaRenderContext(
        <EnterpriseSearchContentPageTemplate pageViewTelemetry="some_page" />
      );

      await waitFor(() => {
        expect(mockTelemetryActions.sendTelemetry).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'viewed', metric: 'some_page' })
        );
      });
    });
  });

  describe('props', () => {
    it('passes down any ...pageTemplateProps that EnterpriseSearchPageTemplateWrapper accepts', () => {
      renderWithKibanaRenderContext(
        <EnterpriseSearchContentPageTemplate pageHeader={{ pageTitle: 'hello world' }} />
      );

      expect(screen.getByText('hello world')).toBeInTheDocument();
    });

    it('passes isLoading to EnterpriseSearchPageTemplateWrapper', () => {
      renderWithKibanaRenderContext(<EnterpriseSearchContentPageTemplate isLoading />);

      expect(screen.getByTestId('enterpriseSearchLoading')).toBeInTheDocument();
    });

    it('passes emptyState to EnterpriseSearchPageTemplateWrapper', () => {
      renderWithKibanaRenderContext(
        <EnterpriseSearchContentPageTemplate
          isEmptyState
          emptyState={<div data-test-subj="emptyState" />}
        />
      );

      expect(screen.getByTestId('emptyState')).toBeInTheDocument();
    });
  });
});
