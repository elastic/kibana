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
import {
  buildMockMitreTacticSummary,
  buildMockMitreTechniqueSummary,
  buildMockMitreSubtechniqueSummary,
} from '../../../../../common/detection_engine/mitre/mitre_entity_builders.mock';

// Replace EuiSuperSelect with a flat list so tests can assert on option order without
// opening the dropdown popover. The real component hides options until clicked.
jest.mock('@elastic/eui', () => {
  const ReactForMock = jest.requireActual<typeof import('react')>('react');
  const actual = jest.requireActual<typeof import('@elastic/eui')>('@elastic/eui');
  return {
    ...actual,
    EuiSuperSelect: (props: Record<string, unknown>) => {
      const options = props.options as ReadonlyArray<{ value: string; inputDisplay: unknown }>;
      const testSubj = props['data-test-subj'] as string | undefined;
      return ReactForMock.createElement(
        'ul',
        { 'data-test-subj': testSubj },
        options.map((opt) =>
          ReactForMock.createElement(
            'li',
            { key: opt.value, 'data-option-value': opt.value },
            opt.inputDisplay
          )
        )
      );
    },
  };
});

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

// Test seam: EuiSuperSelect is mocked (above) to render each option as an <li
// data-option-value="..."> element. This lets tests query option order without
// interacting with the real popover. The placeholder 'none' option is always first;
// the entity options that follow it must be in alphabetical name order.
describe('AddMitreThreat - option ordering', () => {
  // Deliberate id-vs-name mismatch: TA001 → "Zulu Tactic" sorts after TA002 → "Alpha Tactic"
  // by name but before it by id. After the picker sorts by name, Alpha must precede Zulu.
  const idOrderedTactics = [
    buildMockMitreTacticSummary({ id: 'TA001', name: 'Zulu Tactic' }),
    buildMockMitreTacticSummary({ id: 'TA002', name: 'Alpha Tactic' }),
  ];
  const idOrderedTechniques = [
    buildMockMitreTechniqueSummary({ id: 'T001', name: 'Zulu Technique', tactic_ids: ['TA001'] }),
    buildMockMitreTechniqueSummary({ id: 'T002', name: 'Alpha Technique', tactic_ids: ['TA001'] }),
  ];
  const idOrderedSubtechniques = [
    buildMockMitreSubtechniqueSummary({
      id: 'T001.001',
      name: 'Zulu Sub',
      tactic_ids: ['TA001'],
      technique_id: 'T001',
    }),
    buildMockMitreSubtechniqueSummary({
      id: 'T001.002',
      name: 'Alpha Sub',
      tactic_ids: ['TA001'],
      technique_id: 'T001',
    }),
  ];

  beforeEach(() => {
    mockUseMitreConfiguration.mockReturnValue({
      tactics: idOrderedTactics,
      techniques: idOrderedTechniques,
      subtechniques: idOrderedSubtechniques,
      frameworkVersion: '16.1',
      isLoading: false,
      isError: false,
    });
  });

  const renderWithThreats = (threats: unknown[]) => {
    const Component = () => {
      const field = useFormFieldMock<unknown>({ value: threats, label: 'MITRE' });
      return (
        <AddMitreAttackThreat
          dataTestSubj="dataTestSubj"
          idAria="idAria"
          isDisabled={false}
          field={field}
        />
      );
    };
    return render(<Component />, { wrapper: TestProviders });
  };

  it('tactic dropdown options appear alphabetically by name', () => {
    renderWithThreats([{ tactic: { id: 'none', name: 'none', reference: 'none' }, technique: [] }]);

    const tacticList = screen.getByTestId('mitreAttackTactic');
    const optionValues = Array.from(
      tacticList.querySelectorAll<HTMLElement>('li[data-option-value]')
    )
      .map((el) => el.getAttribute('data-option-value'))
      .filter((v) => v !== 'none');

    // Alpha Tactic (TA002) must precede Zulu Tactic (TA001) after alphabetical sort.
    expect(optionValues).toEqual(['TA002', 'TA001']);
  });

  it('technique dropdown options appear alphabetically by name', () => {
    renderWithThreats([
      {
        tactic: { id: 'TA001', name: 'Zulu Tactic', reference: '' },
        technique: [{ id: 'none', name: 'none', reference: 'none', subtechnique: [] }],
      },
    ]);

    const techniqueList = screen.getByTestId('mitreAttackTechnique');
    const optionValues = Array.from(
      techniqueList.querySelectorAll<HTMLElement>('li[data-option-value]')
    )
      .map((el) => el.getAttribute('data-option-value'))
      .filter((v) => v !== 'none');

    // Alpha Technique (T002) must precede Zulu Technique (T001) after alphabetical sort.
    expect(optionValues).toEqual(['T002', 'T001']);
  });

  it('subtechnique dropdown options appear alphabetically by name', () => {
    renderWithThreats([
      {
        tactic: { id: 'TA001', name: 'Zulu Tactic', reference: '' },
        technique: [
          {
            id: 'T001',
            name: 'Zulu Technique',
            reference: '',
            subtechnique: [{ id: 'none', name: 'none', reference: 'none' }],
          },
        ],
      },
    ]);

    const subtechniqueList = screen.getByTestId('mitreAttackSubtechnique');
    const optionValues = Array.from(
      subtechniqueList.querySelectorAll<HTMLElement>('li[data-option-value]')
    )
      .map((el) => el.getAttribute('data-option-value'))
      .filter((v) => v !== 'none');

    // Alpha Sub (T001.002) must precede Zulu Sub (T001.001) after alphabetical sort.
    expect(optionValues).toEqual(['T001.002', 'T001.001']);
  });
});
