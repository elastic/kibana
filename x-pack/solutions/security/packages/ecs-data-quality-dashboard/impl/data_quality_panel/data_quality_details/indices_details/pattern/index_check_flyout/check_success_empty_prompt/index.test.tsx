/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';

import { INCOMPATIBLE_EMPTY, INCOMPATIBLE_EMPTY_TITLE } from './translations';
import { CheckSuccessEmptyPrompt } from '.';

describe('CheckSuccessEmptyPrompt', () => {
  it('should render incompatible empty prompt message', () => {
    render(<CheckSuccessEmptyPrompt />);

    expect(screen.getByText(INCOMPATIBLE_EMPTY_TITLE)).toBeInTheDocument();
    expect(screen.getByText(INCOMPATIBLE_EMPTY)).toBeInTheDocument();
  });
});
