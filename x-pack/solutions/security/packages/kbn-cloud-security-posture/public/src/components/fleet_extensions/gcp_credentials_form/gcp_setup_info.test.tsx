/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GCPSetupInfoContent } from './gcp_setup_info';
import { I18nProvider } from '@kbn/i18n-react';

// Mock the useCloudSetup hook
const mockUseCloudSetup = jest.fn();

jest.mock('../hooks/use_cloud_setup_context', () => ({
  useCloudSetup: () => mockUseCloudSetup(),
}));

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('GCPSetupInfoContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudSetup.mockReturnValue({
      gcpOverviewPath: 'https://docs.elastic.co/gcp-overview',
    });
  });

  describe('rendering', () => {
    it('renders the setup access title', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      expect(screen.getByRole('heading', { name: /setup access/i })).toBeInTheDocument();
    });

    it('renders horizontal rule separator', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      const horizontalRule = document.querySelector('.euiHorizontalRule');
      expect(horizontalRule).toBeInTheDocument();
    });

    it('renders getting started link', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      const gettingStartedLink = screen.getByRole('link', { name: /getting started/i });
      expect(gettingStartedLink).toBeInTheDocument();
      expect(gettingStartedLink).toHaveAttribute('href', 'https://docs.elastic.co/gcp-overview');
      expect(gettingStartedLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('agent-based setup', () => {
    it('renders agent-based setup information when isAgentless is false', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      // Should contain text about selecting preferred method
      expect(screen.getByText(/select your preferred method/i)).toBeInTheDocument();

      // Should contain text about elevated access for CIS benchmark rules
      expect(
        screen.getByText(/elevated access to run some CIS benchmark rules/i)
      ).toBeInTheDocument();

      // Should contain text about step-by-step instructions
      expect(screen.getByText(/step-by-step instructions to generate/i)).toBeInTheDocument();
    });

    it('contains agent-based specific messaging', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      // Agent-based should mention providing GCP credentials
      expect(screen.getByText(/providing the gcp credentials/i)).toBeInTheDocument();

      // Should mention method of providing credentials
      expect(screen.getByText(/method of providing/i)).toBeInTheDocument();
    });
  });

  describe('agentless setup', () => {
    it('renders agentless setup information when isAgentless is true', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={true} />);

      // Should contain text about elevated access for CIS benchmark rules
      expect(
        screen.getByText(/elevated access to run some CIS benchmark rules/i)
      ).toBeInTheDocument();

      // Should contain text about step-by-step instructions
      expect(screen.getByText(/step-by-step instructions to generate/i)).toBeInTheDocument();
    });

    it('contains agentless specific messaging', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={true} />);

      // Agentless should not mention selecting preferred method
      expect(screen.queryByText(/select your preferred method/i)).not.toBeInTheDocument();

      // Should not mention providing GCP credentials
      expect(screen.queryByText(/providing the gcp credentials/i)).not.toBeInTheDocument();
    });

    it('renders getting started link for agentless setup', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={true} />);

      const gettingStartedLink = screen.getByRole('link', { name: /getting started/i });
      expect(gettingStartedLink).toBeInTheDocument();
      expect(gettingStartedLink).toHaveAttribute('href', 'https://docs.elastic.co/gcp-overview');
    });
  });

  describe('link behavior', () => {
    it('opens getting started link in new tab', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      const gettingStartedLink = screen.getByRole('link', { name: /getting started/i });
      expect(gettingStartedLink).toHaveAttribute('target', '_blank');
    });

    it('uses the gcpOverviewPath from useCloudSetup hook', () => {
      mockUseCloudSetup.mockReturnValue({
        gcpOverviewPath: 'https://custom-docs.example.com/gcp',
      });

      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      const gettingStartedLink = screen.getByRole('link', { name: /getting started/i });
      expect(gettingStartedLink).toHaveAttribute('href', 'https://custom-docs.example.com/gcp');
    });
  });

  describe('content structure', () => {
    it('has proper heading hierarchy', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      const heading = screen.getByRole('heading', { name: /setup access/i });
      expect(heading.tagName).toBe('H2');
    });

    it('contains expected text elements', () => {
      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      // Should have text about integration needing access
      expect(screen.getByText(/the integration will need/i)).toBeInTheDocument();

      // Should have text about CIS benchmark rules
      expect(screen.getByText(/cis benchmark rules/i)).toBeInTheDocument();

      // Should reference our guide
      expect(screen.getByText(/refer to our/i)).toBeInTheDocument();
    });

    it('maintains consistent messaging between agent-based and agentless', () => {
      // Test agent-based
      const { rerender } = renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      expect(screen.getByText(/the integration will need elevated access/i)).toBeInTheDocument();
      expect(screen.getByText(/cis benchmark rules/i)).toBeInTheDocument();
      expect(screen.getByText(/step-by-step instructions/i)).toBeInTheDocument();

      // Test agentless
      rerender(
        <I18nProvider>
          <GCPSetupInfoContent isAgentless={true} />
        </I18nProvider>
      );

      expect(screen.getByText(/the integration will need elevated access/i)).toBeInTheDocument();
      expect(screen.getByText(/cis benchmark rules/i)).toBeInTheDocument();
      expect(screen.getByText(/step-by-step instructions/i)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles missing gcpOverviewPath gracefully', () => {
      mockUseCloudSetup.mockReturnValue({
        gcpOverviewPath: '',
      });

      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      const gettingStartedLink = screen.getByText('Getting Started');
      expect(gettingStartedLink).toBeInTheDocument();
      // Should handle empty href gracefully
      expect(gettingStartedLink.closest('a')).toHaveAttribute('href', '');
    });

    it('handles empty gcpOverviewPath', () => {
      mockUseCloudSetup.mockReturnValue({
        gcpOverviewPath: '',
      });

      renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);

      const gettingStartedLink = screen.getByText('Getting Started');
      expect(gettingStartedLink.closest('a')).toHaveAttribute('href', '');
    });

    it('renders without crashing when hook returns null', () => {
      mockUseCloudSetup.mockReturnValue({
        gcpOverviewPath: '',
      });

      expect(() => {
        renderWithIntl(<GCPSetupInfoContent isAgentless={false} />);
      }).not.toThrow();
    });
  });
});
