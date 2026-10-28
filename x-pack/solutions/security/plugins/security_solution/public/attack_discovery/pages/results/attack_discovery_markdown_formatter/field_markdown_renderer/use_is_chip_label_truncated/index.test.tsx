/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { useIsChipLabelTruncated } from '.';

const TestLabel = ({ isEnabled, value }: { isEnabled?: boolean; value: string }) => {
  const { chipLabelRef, isValueTruncated } = useIsChipLabelTruncated(value, isEnabled);

  return (
    <span data-test-subj="label" data-truncated={String(isValueTruncated)} ref={chipLabelRef}>
      {value}
    </span>
  );
};

describe('useIsChipLabelTruncated', () => {
  const mockWidths = ({
    clientWidth,
    scrollWidth,
  }: {
    clientWidth: number;
    scrollWidth: number;
  }) => {
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
    jest.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports a label that overflows its box as truncated', () => {
    mockWidths({ clientWidth: 100, scrollWidth: 250 });

    render(<TestLabel value="6364495c-9c4a-43ab-add4-1816a4365f53" />);

    expect(screen.getByTestId('label')).toHaveAttribute('data-truncated', 'true');
  });

  it('reports a label that fits its box as not truncated', () => {
    mockWidths({ clientWidth: 100, scrollWidth: 100 });

    render(<TestLabel value="srv-1" />);

    expect(screen.getByTestId('label')).toHaveAttribute('data-truncated', 'false');
  });

  it('skips the measurement and reports not truncated when disabled', () => {
    const scrollWidth = jest.fn(() => 250);
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    jest.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(scrollWidth);

    render(<TestLabel isEnabled={false} value="6364495c-9c4a-43ab-add4-1816a4365f53" />);

    expect(screen.getByTestId('label')).toHaveAttribute('data-truncated', 'false');
    expect(scrollWidth).not.toHaveBeenCalled();
  });

  it('re-measures when the value changes', () => {
    mockWidths({ clientWidth: 100, scrollWidth: 100 });
    const { rerender } = render(<TestLabel value="srv-1" />);

    mockWidths({ clientWidth: 100, scrollWidth: 250 });
    rerender(<TestLabel value="6364495c-9c4a-43ab-add4-1816a4365f53" />);

    expect(screen.getByTestId('label')).toHaveAttribute('data-truncated', 'true');
  });
});
