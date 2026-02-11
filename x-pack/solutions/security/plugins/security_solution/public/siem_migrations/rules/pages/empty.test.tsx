/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EmptyMigrationRulesPage } from './empty';
import { TestProviders } from '../../../common/mock/test_providers';

describe('EmptyMigrationRulesPage', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EmptyMigrationRulesPage />
      </TestProviders>
    );

    expect(getByTestId('siemMigrationsTranslatedRulesEmptyPageHeader')).toBeInTheDocument();
    expect(getByTestId('siemMigrationsTranslatedRulesEmptyPageMessage')).toBeInTheDocument();
  });
});
