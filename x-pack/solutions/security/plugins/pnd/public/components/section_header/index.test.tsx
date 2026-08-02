/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';

import { SectionHeader } from '.';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';

describe('SectionHeader', () => {
  const defaultProps = {
    count: 3,
    countTestSubj: 'pndSectionHeaderCount',
    label: 'Contain',
  };

  it('names the section as a heading, so the page outline lists it', () => {
    renderWithPndProviders(<SectionHeader {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Contain' })).toBeInTheDocument();
  });

  it('draws the row count', () => {
    renderWithPndProviders(<SectionHeader {...defaultProps} />);

    expect(screen.getByTestId('pndSectionHeaderCount')).toHaveTextContent('3');
  });

  it('draws a zero rather than nothing, so an empty section still reads as counted', () => {
    renderWithPndProviders(<SectionHeader {...defaultProps} count={0} />);

    expect(screen.getByTestId('pndSectionHeaderCount')).toHaveTextContent('0');
  });

  it('leaves the count out of the heading, so a screen reader is not read a bare digit', () => {
    renderWithPndProviders(<SectionHeader {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Contain' })).not.toHaveTextContent('3');
  });

  describe('the accent dot', () => {
    it('carries the bucket the section was given', () => {
      const { container } = renderWithPndProviders(
        <SectionHeader {...defaultProps} dotColor="danger" />
      );

      expect(container.querySelector('[data-section-dot]')).toHaveAttribute(
        'data-section-dot',
        'danger'
      );
    });

    it('accents the record with success, the one role no bucket uses', () => {
      const { container } = renderWithPndProviders(
        <SectionHeader {...defaultProps} dotColor="success" label="Resolved" />
      );

      expect(container.querySelector('[data-section-dot]')).toHaveAttribute(
        'data-section-dot',
        'success'
      );
    });

    it('is absent when no accent was asked for, rather than drawn in a default color', () => {
      const { container } = renderWithPndProviders(<SectionHeader {...defaultProps} />);

      expect(container.querySelector('[data-section-dot]')).not.toBeInTheDocument();
    });

    it('is hidden from screen readers, because the heading already names the section', () => {
      const { container } = renderWithPndProviders(
        <SectionHeader {...defaultProps} dotColor="danger" />
      );

      expect(container.querySelector('[data-section-dot]')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
