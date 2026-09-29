/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { shallow } from 'enzyme';

import { AddMitreAttackThreat } from '.';
import { useFormFieldMock, TestProviders } from '../../../../common/mock';
import {
  createEmptyMitreConfiguration,
  createPopulatedMitreConfiguration,
} from '../../../../common/hooks/mitre/use_mitre_configuration.mock';

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

const mockUseMitreConfiguration = jest.fn();
jest.mock('../../../../common/hooks/mitre/use_mitre_configuration', () => ({
  useMitreConfiguration: (...args: unknown[]) => mockUseMitreConfiguration(...args),
}));

describe('AddMitreThreat', () => {
  beforeEach(() => {
    mockUseMitreConfiguration.mockReturnValue(createPopulatedMitreConfiguration());
  });

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
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="addMitreAttackTactic"]')).toHaveLength(1);
  });

  it('renders a loading spinner while MITRE data is loading', () => {
    mockUseMitreConfiguration.mockReturnValue(createEmptyMitreConfiguration({ isLoading: true }));

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

    expect(screen.getByTestId('mitreAttackLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('addMitreAttackTactic')).not.toBeInTheDocument();
  });

  it('renders an inline error message when MITRE data fails to load', () => {
    mockUseMitreConfiguration.mockReturnValue(createEmptyMitreConfiguration({ isError: true }));

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

    expect(screen.getByTestId('mitreAttackError')).toBeInTheDocument();
    expect(screen.queryByTestId('addMitreAttackTactic')).not.toBeInTheDocument();
  });
});
