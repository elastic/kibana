/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { ValidationStep } from '.';
import * as i18n from '../translations';

describe('ValidationStep', () => {
  it('renders the validation section description', () => {
    render(<ValidationStep validationPanel={<div data-test-subj="validationPanel" />} />);

    expect(screen.getByText(i18n.VALIDATION_SECTION_DESCRIPTION)).toBeInTheDocument();
  });

  it('renders the validation panel', () => {
    render(<ValidationStep validationPanel={<div data-test-subj="validationPanel" />} />);

    expect(screen.getByTestId('validationPanel')).toBeInTheDocument();
  });
});
