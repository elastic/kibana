/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GoogleCloudShellCredentialsGuide } from './gcp_credentials_guide';
import { I18nProvider } from '@kbn/i18n-react';

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('GoogleCloudShellCredentialsGuide', () => {
  const defaultProps = {
    commandText: 'gcloud config set project <PROJECT_ID> ./deploy_service_account.sh',
    isOrganization: false,
  };

  describe('rendering', () => {
    it('renders the guide with default single project setup', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...defaultProps} />);

      // Check for main description text (text is split across elements)
      expect(
        screen.getByText(/will generate a Service Account Credentials JSON key/)
      ).toBeInTheDocument();

      // Check for link to documentation
      const externalLink = screen.getByTestId('externalLink');
      expect(externalLink).toBeInTheDocument();
      expect(externalLink).toHaveAttribute('href', 'https://cloud.google.com/shell/docs');
    });

    it('renders step-by-step instructions', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...defaultProps} />);

      // Check for instruction steps (should be in an ordered list)
      const orderedList = screen.getByRole('list');
      expect(orderedList).toBeInTheDocument();
      expect(orderedList.tagName).toBe('OL');

      // Check for some key instruction text
      expect(screen.getByText('Google Cloud Console')).toBeInTheDocument();
      expect(screen.getByText('Launch Google Cloud Shell')).toBeInTheDocument();
    });

    it('renders the command code block', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...defaultProps} />);

      // Check for the code element with bash language
      const codeElement = screen.getByText(defaultProps.commandText);
      expect(codeElement).toBeInTheDocument();
      expect(codeElement.tagName).toBe('CODE');
      expect(codeElement).toHaveAttribute('data-code-language', 'bash');
    });

    it('renders external link with proper attributes', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...defaultProps} />);

      const externalLink = screen.getByTestId('externalLink');
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'nofollow noopener noreferrer');
    });
  });

  describe('single project setup', () => {
    it('shows single project instruction text', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...defaultProps} />);

      // Should show single project instruction (text is split)
      expect(screen.getByText(/Replace <PROJECT_ID> in the following command/)).toBeInTheDocument();
    });

    it('displays the correct command for single project', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...defaultProps} />);

      expect(screen.getByText(defaultProps.commandText)).toBeInTheDocument();
    });
  });

  describe('organization setup', () => {
    const orgProps = {
      ...defaultProps,
      isOrganization: true,
    };

    it('shows organization instruction text', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...orgProps} />);

      // Should show organization instruction (text is split)
      expect(screen.getByText(/Replace <PROJECT_ID> and <ORG_ID_VALUE>/)).toBeInTheDocument();
    });

    it('displays the command for organization setup', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...orgProps} />);

      expect(screen.getByText(orgProps.commandText)).toBeInTheDocument();
    });
  });

  describe('command text variations', () => {
    it('handles custom command text', () => {
      const customProps = {
        ...defaultProps,
        commandText: 'custom gcloud command here',
      };

      renderWithIntl(<GoogleCloudShellCredentialsGuide {...customProps} />);

      expect(screen.getByText('custom gcloud command here')).toBeInTheDocument();
    });

    it('handles empty command text', () => {
      const emptyProps = {
        ...defaultProps,
        commandText: '',
      };

      renderWithIntl(<GoogleCloudShellCredentialsGuide {...emptyProps} />);

      // Should still render the guide structure - check for the link specifically
      const externalLink = screen.getByTestId('externalLink');
      expect(externalLink).toBeInTheDocument();
      expect(externalLink).toHaveTextContent('Google Cloud Shell');

      // Code element should exist (even if empty)
      const codeElements = screen.getAllByRole('code');
      expect(codeElements.length).toBeGreaterThan(0);
    });

    it('handles complex command text with special characters', () => {
      const complexProps = {
        ...defaultProps,
        commandText: 'gcloud config set project "my-project-123" && ./script.sh --flag="value"',
      };

      renderWithIntl(<GoogleCloudShellCredentialsGuide {...complexProps} />);

      expect(screen.getByText(complexProps.commandText)).toBeInTheDocument();
    });
  });

  describe('instruction steps', () => {
    it('renders all required instruction steps', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...defaultProps} />);

      // Step 1: Log into Google Cloud Console
      expect(screen.getByText('Google Cloud Console')).toBeInTheDocument();

      // Step 3: Launch Google Cloud Shell
      expect(screen.getByText('Launch Google Cloud Shell')).toBeInTheDocument();

      // Step 4: Trust Repo and Confirm
      expect(screen.getByText('Trust Repo')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();

      // Step 5: Run command (text is split across elements, use matcher function)
      expect(
        screen.getByText((content, element) => {
          return (
            element?.textContent === 'Paste and run command in the Google Cloud Shell terminal'
          );
        })
      ).toBeInTheDocument();

      // Step 6: Copy JSON
      expect(screen.getByText('cat KEY_FILE.json')).toBeInTheDocument();
    });

    it('displays steps in correct order with proper numbering', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...defaultProps} />);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(6); // Should have 6 instruction steps
    });
  });

  describe('content validation', () => {
    it('contains all required instructional content', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...defaultProps} />);

      // Main description (text is split across elements)
      expect(
        screen.getByText(/will generate a Service Account Credentials JSON key/)
      ).toBeInTheDocument();

      // Key terms and concepts
      expect(screen.getByText('Google Cloud Console')).toBeInTheDocument();

      // Check that Google Cloud Shell appears in the documentation link
      const externalLink = screen.getByTestId('externalLink');
      expect(externalLink).toHaveTextContent('Google Cloud Shell');

      // And also appears in the instruction steps
      expect(screen.getByText('Launch Google Cloud Shell')).toBeInTheDocument();
    });

    it('includes proper documentation reference', () => {
      renderWithIntl(<GoogleCloudShellCredentialsGuide {...defaultProps} />);

      const docLink = screen.getByTestId('externalLink');
      expect(docLink).toHaveAttribute('href', 'https://cloud.google.com/shell/docs');
    });
  });

  describe('edge cases', () => {
    it('handles very long command text', () => {
      const longCommandProps = {
        ...defaultProps,
        commandText:
          'gcloud config set project my-very-long-project-name && ./deploy_service_account.sh --with-flags',
      };

      renderWithIntl(<GoogleCloudShellCredentialsGuide {...longCommandProps} />);

      expect(screen.getByText(longCommandProps.commandText)).toBeInTheDocument();
    });

    it('handles command text with special characters', () => {
      const specialCharsProps = {
        ...defaultProps,
        commandText: 'gcloud config set project "my-project" && echo "Hello!"',
      };

      renderWithIntl(<GoogleCloudShellCredentialsGuide {...specialCharsProps} />);

      expect(screen.getByText(specialCharsProps.commandText)).toBeInTheDocument();
    });

    it('handles undefined isOrganization prop', () => {
      const undefinedOrgProps = {
        commandText: defaultProps.commandText,
        // isOrganization is undefined
      };

      renderWithIntl(<GoogleCloudShellCredentialsGuide {...undefinedOrgProps} />);

      // Should default to single project setup
      expect(screen.getByText(/Replace <PROJECT_ID> in the following command/)).toBeInTheDocument();
    });
  });
});
