/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/dom';
import { EntityStoreV2Disabled } from './entity_store_v2_disabled';
import { renderWithTestProvider } from '../../test/test_provider';
import { TEST_SUBJ_ONBOARDING_ENTITY_STORE_V2_DISABLED } from '../../constants';

describe('EntityStoreV2Disabled Component', () => {
  it('should render the component correctly', () => {
    renderWithTestProvider(<EntityStoreV2Disabled />);

    expect(screen.getByTestId(TEST_SUBJ_ONBOARDING_ENTITY_STORE_V2_DISABLED)).toBeInTheDocument();
    expect(screen.getByText(/entity store v2 is required/i)).toBeInTheDocument();
    expect(screen.getByText(/need help?/i)).toBeInTheDocument();
  });

  it('should mention both v2 prerequisites by name', () => {
    renderWithTestProvider(<EntityStoreV2Disabled />);

    expect(screen.getByText('securitySolution:entityStoreEnableV2')).toBeInTheDocument();
    expect(screen.getByText('entityAnalyticsEntityStoreV2')).toBeInTheDocument();
  });
});
