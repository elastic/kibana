/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Callout } from './callout';
import { getCalloutConfig } from './callout.config';
import { GRAPH_CALLOUT_TEST_ID, GRAPH_CALLOUT_LINK_TEST_ID } from '../test_ids';

describe('Callout', () => {
  describe('missingAllRequirements variant', () => {
    const config = getCalloutConfig('missingAllRequirements');

    it('renders with correct title', () => {
      render(<Callout {...config} />);

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Enrich graph experience')).toBeInTheDocument();
    });

    it('renders two links with correct text opening in new tabs', () => {
      render(<Callout {...config} />);

      const links = screen.getAllByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveTextContent('Install Cloud Asset Discovery');
      expect(links[0]).toHaveAttribute('target', '_blank');
      expect(links[1]).toHaveTextContent('Enable Entity Store');
      expect(links[1]).toHaveAttribute('target', '_blank');
    });
  });

  describe('uninstalledIntegration variant', () => {
    const config = getCalloutConfig('uninstalledIntegration');

    it('renders with correct title', () => {
      render(<Callout {...config} />);

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Enrich graph experience')).toBeInTheDocument();
    });

    it('renders link with correct text opening in a new tab', () => {
      render(<Callout {...config} />);

      const link = screen.getByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(link).toHaveTextContent('Install Cloud Asset Discovery');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('disabledEntityStore variant', () => {
    const config = getCalloutConfig('disabledEntityStore');

    it('renders with correct title', () => {
      render(<Callout {...config} />);

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Enrich graph experience')).toBeInTheDocument();
    });

    it('renders link with correct text opening in a new tab', () => {
      render(<Callout {...config} />);

      const link = screen.getByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(link).toHaveTextContent('Enable Entity Store');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('unavailableEntityInfo variant', () => {
    const config = getCalloutConfig('unavailableEntityInfo');

    it('renders with correct title', () => {
      render(<Callout {...config} />);

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Entity information unavailable')).toBeInTheDocument();
    });

    it('renders link with correct text opening in a new tab', () => {
      render(<Callout {...config} />);

      const link = screen.getByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(link).toHaveTextContent('Verify Cloud Asset Discovery Data');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('unknownEntityType variant', () => {
    const config = getCalloutConfig('unknownEntityType');

    it('renders with correct title', () => {
      render(<Callout {...config} />);

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Unknown entity type')).toBeInTheDocument();
    });

    it('renders link with correct text opening in a new tab', () => {
      render(<Callout {...config} />);

      const link = screen.getByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(link).toHaveTextContent('Verify Cloud Asset Discovery');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('custom props', () => {
    it('renders with custom title, message, and links', () => {
      render(
        <Callout
          title="Custom Title"
          message="Custom message content"
          links={[
            { text: 'Custom Link 1', href: '/custom-link-1' },
            { text: 'Custom Link 2', href: '/custom-link-2' },
          ]}
        />
      );

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom message content')).toBeInTheDocument();

      const links = screen.getAllByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveTextContent('Custom Link 1');
      expect(links[0]).toHaveAttribute('href', '/custom-link-1');
      expect(links[1]).toHaveTextContent('Custom Link 2');
      expect(links[1]).toHaveAttribute('href', '/custom-link-2');
    });
  });

  describe('dismiss functionality', () => {
    it('calls onDismiss when close button is clicked', async () => {
      const mockOnDismiss = jest.fn();
      const config = getCalloutConfig('uninstalledIntegration');
      render(<Callout {...config} onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByLabelText('Dismiss this callout');
      await userEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not render close button when onDismiss is undefined', () => {
      const config = getCalloutConfig('uninstalledIntegration');
      render(<Callout {...config} />);

      expect(screen.queryByLabelText('Dismiss this callout')).not.toBeInTheDocument();
    });
  });
});
