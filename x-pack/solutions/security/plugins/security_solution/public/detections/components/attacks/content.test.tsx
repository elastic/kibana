/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { AttacksPageContent, SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID } from './content';

describe('AttacksPageContent', () => {
  it('should render correctly', async () => {
    render(
      <TestProviders>
        <AttacksPageContent />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId(SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId('header-page-title')).toHaveTextContent('Attacks');
    });
  });
});
