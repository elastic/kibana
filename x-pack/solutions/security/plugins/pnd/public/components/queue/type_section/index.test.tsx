/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { TypeSection } from '.';

const defaultProps = {
  children: <div data-test-subj="pndQueueTypeSectionChild">row</div>,
  count: 3,
  dotColor: 'danger' as const,
  label: 'Contain',
  sectionId: 'contain',
};

describe('TypeSection', () => {
  it('names the section as a heading', () => {
    renderWithPndProviders(<TypeSection {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Contain' })).toBeInTheDocument();
  });

  it('draws the pending-only count', () => {
    renderWithPndProviders(<TypeSection {...defaultProps} />);

    expect(screen.getByTestId('pndQueueTypeSectionCount-contain')).toHaveTextContent('3');
  });

  it('draws a zero rather than hiding an empty section header', () => {
    renderWithPndProviders(<TypeSection {...defaultProps} count={0} />);

    expect(screen.getByTestId('pndQueueTypeSectionCount-contain')).toHaveTextContent('0');
  });

  it('accents the header with the severity dot', () => {
    const { container } = renderWithPndProviders(<TypeSection {...defaultProps} />);

    expect(container.querySelector('[data-section-dot]')).toHaveAttribute(
      'data-section-dot',
      'danger'
    );
  });

  it('renders the rows it was given', () => {
    renderWithPndProviders(<TypeSection {...defaultProps} />);

    expect(screen.getByTestId('pndQueueTypeSectionChild')).toHaveTextContent('row');
  });

  it('does not draw a +N more fold, which is thread-mode only', () => {
    renderWithPndProviders(<TypeSection {...defaultProps} />);

    expect(screen.queryByTestId('pndQueueThreadGroupShowMore')).toBeNull();
  });

  it('renders no type badges', () => {
    renderWithPndProviders(<TypeSection {...defaultProps} />);

    expect(
      ['Investigation', 'Sub-investigation', 'Incident'].some(
        (label) => screen.queryByText(label) != null
      )
    ).toBe(false);
  });

  it('starts open so pending rows are not hidden behind a collapsed header', () => {
    renderWithPndProviders(<TypeSection {...defaultProps} />);

    expect(screen.getByTestId('pndQueueTypeSectionChild')).toBeVisible();
  });

  it('notifies when the analyst toggles the section', () => {
    const onToggle = jest.fn();

    renderWithPndProviders(<TypeSection {...defaultProps} onToggle={onToggle} />);

    fireEvent.click(screen.getByTestId('pndQueueTypeSectionToggle-contain'));

    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
