/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { shallow } from 'enzyme';

import { AddMitreAttackThreat } from '.';
import { useFormFieldMock, TestProviders } from '../../../../common/mock';
import {
  createEmptyMitreConfiguration,
  createPopulatedMitreConfiguration,
} from '../../../../common/hooks/mitre/use_mitre_configuration.mock';
import { buildMockMitreTacticSummary } from '../../../../../common/detection_engine/mitre/mitre_entity_builders.mock';

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

  it('renders tactic options in the order provided by the MITRE configuration', async () => {
    const tactics = [
      buildMockMitreTacticSummary({ id: 'TA0001', name: 'Charlie', position: 0 }),
      buildMockMitreTacticSummary({ id: 'TA0002', name: 'Bravo', position: 1 }),
      buildMockMitreTacticSummary({ id: 'TA0003', name: 'Alpha', position: 2 }),
    ];
    mockUseMitreConfiguration.mockReturnValue(createPopulatedMitreConfiguration({ tactics }));

    const Component = () => {
      const field = useFormFieldMock<unknown>({
        value: [{ tactic: { id: 'none', name: 'none', reference: 'none' }, technique: [] }],
      });
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

    await userEvent.click(screen.getByTestId('mitreAttackTactic'));

    const options = screen.getAllByRole('option');
    const labels = options
      .map((option) => option.textContent)
      .filter((text) => text != null && !text.includes('Select a tactic'));

    expect(labels).toEqual(['Charlie (TA0001)', 'Bravo (TA0002)', 'Alpha (TA0003)']);
  });
});
