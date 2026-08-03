/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { AddMitreAttackThreat } from '.';
import { TestProviders, useFormFieldMock } from '../../../../common/mock';

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

describe('AddMitreThreat', () => {
  it('renders correctly', () => {
    const Component = () => {
      const field = useFormFieldMock<unknown>({ value: [] });

      return (
        <AddMitreAttackThreat
          dataTestSubj="dataTestSubj"
          idAria="idAria"
          isDisabled={false}
          field={field}
        />
      );
    };
    render(<Component />, { wrapper: TestProviders });

    expect(screen.getByTestId('addMitreAttackTactic')).toBeInTheDocument();
  });
});
