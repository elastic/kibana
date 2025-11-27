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
import { GRAPH_CALLOUT_TEST_ID, GRAPH_CALLOUT_LINK_TEST_ID } from '../test_ids';

describe('Callout', () => {
  describe('missingAllRequirements variant', () => {
    it('renders with correct title', () => {
      render(<Callout variant="missingAllRequirements" />);

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Enrich graph experience')).toBeInTheDocument();
    });

    it('renders two links with correct text opening in new tabs', () => {
      render(<Callout variant="missingAllRequirements" />);

      const links = screen.getAllByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveTextContent('Install Cloud Asset Discovery');
      expect(links[0]).toHaveAttribute('target', '_blank');
      expect(links[1]).toHaveTextContent('Enable Entity Store');
      expect(links[1]).toHaveAttribute('target', '_blank');
    });
  });

  describe('uninstalledIntegration variant', () => {
    it('renders with correct title', () => {
      render(<Callout variant="uninstalledIntegration" />);

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Enrich graph experience')).toBeInTheDocument();
    });

    it('renders link with correct text opening in a new tab', () => {
      render(<Callout variant="uninstalledIntegration" />);

      const link = screen.getByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(link).toHaveTextContent('Install Cloud Asset Discovery');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('disabledEntityStore variant', () => {
    it('renders with correct title', () => {
      render(<Callout variant="disabledEntityStore" />);

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Enrich graph experience')).toBeInTheDocument();
    });

    it('renders link with correct text opening in a new tab', () => {
      render(<Callout variant="disabledEntityStore" />);

      const link = screen.getByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(link).toHaveTextContent('Enable Entity Store');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('unavailableEntityInfo variant', () => {
    it('renders with correct title', () => {
      render(<Callout variant="unavailableEntityInfo" />);

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Entity information unavailable')).toBeInTheDocument();
    });

    it('renders link with correct text opening in a new tab', () => {
      render(<Callout variant="unavailableEntityInfo" />);

      const link = screen.getByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(link).toHaveTextContent('Verify Cloud Asset Discovery Data');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('unknownEntityType variant', () => {
    it('renders with correct title', () => {
      render(<Callout variant="unknownEntityType" />);

      expect(screen.getByTestId(GRAPH_CALLOUT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByText('Unknown entity type')).toBeInTheDocument();
    });

    it('renders link with correct text opening in a new tab', () => {
      render(<Callout variant="unknownEntityType" />);

      const link = screen.getByTestId(GRAPH_CALLOUT_LINK_TEST_ID);
      expect(link).toHaveTextContent('Verify Cloud Asset Discovery');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('dismiss functionality', () => {
    it('calls onDismiss when close button is clicked', async () => {
      const mockOnDismiss = jest.fn();
      render(<Callout variant="uninstalledIntegration" onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByLabelText('Dismiss this callout');
      await userEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not render close button when onDismiss is undefined', () => {
      render(<Callout variant="uninstalledIntegration" />);

      expect(screen.queryByLabelText('Dismiss this callout')).not.toBeInTheDocument();
    });
  });
});
