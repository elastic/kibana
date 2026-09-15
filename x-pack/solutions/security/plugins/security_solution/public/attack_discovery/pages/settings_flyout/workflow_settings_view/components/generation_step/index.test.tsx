/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { GenerationStep } from '.';
import * as i18n from '../translations';

describe('GenerationStep', () => {
  it('renders the generation section description', () => {
    render(<GenerationStep />);

    expect(screen.getByText(i18n.GENERATION_SECTION_DESCRIPTION)).toBeInTheDocument();
  });

  it('renders the connector selector when provided', () => {
    render(<GenerationStep connectorSelector={<div data-test-subj="testConnectorSelector" />} />);

    expect(screen.getByTestId('testConnectorSelector')).toBeInTheDocument();
  });

  it('does not render the connector selector when not provided', () => {
    render(<GenerationStep />);

    expect(screen.queryByTestId('testConnectorSelector')).not.toBeInTheDocument();
  });
});
