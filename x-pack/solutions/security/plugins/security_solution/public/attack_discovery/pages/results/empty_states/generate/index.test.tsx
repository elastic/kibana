/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { Generate } from '.';
import * as i18n from '../empty_prompt/translations';

describe('Generate Component', () => {
  it('calls onGenerate when the button is clicked', () => {
    const onGenerate = jest.fn();

    render(<Generate isLoading={false} onGenerate={onGenerate} />);

    fireEvent.click(screen.getByTestId('generate'));

    expect(onGenerate).toHaveBeenCalled();
  });

  it('disables the generate button when isLoading is true', () => {
    render(<Generate isLoading={true} onGenerate={jest.fn()} />);

    expect(screen.getByTestId('generate')).toBeDisabled();
  });

  it('disables the generate button when isDisabled is true', () => {
    render(<Generate isLoading={false} isDisabled={true} onGenerate={jest.fn()} />);

    expect(screen.getByTestId('generate')).toBeDisabled();
  });

  it('shows tooltip content when the button is disabled', async () => {
    render(<Generate isLoading={false} isDisabled={true} onGenerate={jest.fn()} />);

    fireEvent.mouseOver(screen.getByTestId('generate'));

    await waitFor(() => {
      expect(screen.getByText(i18n.SELECT_A_CONNECTOR)).toBeInTheDocument();
    });
  });
});
