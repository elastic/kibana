/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CasesTourSteps } from './cases_tour_steps';
import { AlertsCasesTourSteps } from './tour_config';
import { TestProviders } from '../../mock';

jest.mock('./tour_step', () => ({
  GuidedOnboardingTourStep: jest
    .fn()
    .mockImplementation(({ step, onClick }: { onClick: () => void; step: number }) => (
      <button type="submit" data-test-subj={`step-${step}`} onClick={onClick} />
    )),
}));

describe('cases tour steps', () => {
  it('Mounts with AlertsCasesTourSteps.createCase step active', () => {
    const { getByTestId, queryByTestId } = render(<CasesTourSteps />, { wrapper: TestProviders });
    expect(getByTestId(`step-${AlertsCasesTourSteps.createCase}`)).toBeInTheDocument();
    expect(queryByTestId(`step-${AlertsCasesTourSteps.submitCase}`)).not.toBeInTheDocument();
  });
  it('On click next, AlertsCasesTourSteps.submitCase step active', () => {
    const { getByTestId, queryByTestId } = render(<CasesTourSteps />, { wrapper: TestProviders });
    getByTestId(`step-${AlertsCasesTourSteps.createCase}`).click();
    expect(getByTestId(`step-${AlertsCasesTourSteps.submitCase}`)).toBeInTheDocument();
    expect(queryByTestId(`step-${AlertsCasesTourSteps.createCase}`)).not.toBeInTheDocument();
  });
});
