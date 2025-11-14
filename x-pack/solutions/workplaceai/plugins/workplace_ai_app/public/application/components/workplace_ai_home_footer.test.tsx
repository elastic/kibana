/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { WorkplaceAIHomeFooter } from './workplace_ai_home_footer';
import { useKibana } from '../hooks/use_kibana';

jest.mock('../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;

describe('WorkplaceAIHomeFooter', () => {
  const mockNavigateToUrl = jest.fn();
  const mockNavLinksGet = jest.fn();

  const renderWithIntl = (component: React.ReactElement) => {
    return render(
      <EuiProvider>
        <IntlProvider locale="en">{component}</IntlProvider>
      </EuiProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToUrl: mockNavigateToUrl,
        },
        chrome: {
          navLinks: {
            get: mockNavLinksGet,
          },
        },
      },
    });
  });

  describe('Browse Dashboards Panel', () => {
    it('renders Browse dashboards panel', () => {
      mockNavLinksGet.mockReturnValue({ url: '/app/dashboards' });

      renderWithIntl(<WorkplaceAIHomeFooter />);

      expect(screen.getByText('Browse dashboards')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Learn how to create dashboards to Measure adoption, trust, and performance/i
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Explore dashboards')).toBeInTheDocument();
    });

    it('navigates to dashboards app when button is clicked', () => {
      const dashboardsUrl = '/app/dashboards/list';
      mockNavLinksGet.mockImplementation(() => {
        return { url: dashboardsUrl };
      });

      renderWithIntl(<WorkplaceAIHomeFooter />);

      const button = screen.getByText('Explore dashboards');
      fireEvent.click(button);

      expect(mockNavigateToUrl).toHaveBeenCalledWith(dashboardsUrl);
      expect(mockNavigateToUrl).toHaveBeenCalledTimes(1);
    });
  });

  describe('Workflow Template Panel', () => {
    it('renders Use a workflow template panel', () => {
      mockNavLinksGet.mockReturnValue({ url: '/app/workflows' });

      renderWithIntl(<WorkplaceAIHomeFooter />);

      expect(screen.getByText('Use a workflow template')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Try prebuilt automations \(e\.g\., summarize tickets, draft status reports\)/i
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Browse templates')).toBeInTheDocument();
    });

    it('navigates to workflows app when button is clicked', () => {
      const workflowsUrl = '/app/workflows/templates';
      mockNavLinksGet.mockImplementation((id: string) => {
        return { url: workflowsUrl };
      });

      renderWithIntl(<WorkplaceAIHomeFooter />);

      const button = screen.getByText('Browse templates');
      fireEvent.click(button);

      expect(mockNavigateToUrl).toHaveBeenCalledWith(workflowsUrl);
      expect(mockNavigateToUrl).toHaveBeenCalledTimes(1);
    });
  });
});
