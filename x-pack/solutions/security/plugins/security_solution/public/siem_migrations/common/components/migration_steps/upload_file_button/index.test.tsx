/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { UploadFileButton } from '.';

describe('UploadFileButton', () => {
  it('renders the button', () => {
    const { getByTestId } = render(<UploadFileButton />);
    expect(getByTestId('uploadFileButton')).toBeInTheDocument();
  });

  it('calls onClick when the button is clicked', () => {
    const onClick = jest.fn();
    const { getByTestId } = render(<UploadFileButton onClick={onClick} />);
    fireEvent.click(getByTestId('uploadFileButton'));
    expect(onClick).toHaveBeenCalled();
  });
});
