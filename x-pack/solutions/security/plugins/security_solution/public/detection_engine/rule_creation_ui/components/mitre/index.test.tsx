/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AddMitreAttackThreat } from '.';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { MitreConfiguration } from '../../../../common/hooks/mitre/use_mitre_configuration';
import { useFormFieldMock, TestProviders } from '../../../../common/mock';
import {
  createEmptyMitreConfiguration,
  createPopulatedMitreConfiguration,
} from '../../../../common/hooks/mitre/use_mitre_configuration.mock';
import { threatDefault } from '../step_about_rule/default_value';
import { buildMockMitreTacticSummary } from '../../../../../common/detection_engine/mitre/mitre_entity_builders.mock';

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

const mockUseMitreConfiguration = jest.fn();
jest.mock('../../../../common/hooks/mitre/use_mitre_configuration', () => ({
  useMitreConfiguration: (...args: unknown[]) => mockUseMitreConfiguration(...args),
}));

const mockUseAvailableMitreFrameworks = jest.fn();
jest.mock('../../../../common/hooks/mitre/use_available_mitre_frameworks', () => ({
  useAvailableMitreFrameworks: () => mockUseAvailableMitreFrameworks(),
}));

const ENTERPRISE_ROW = {
  framework: 'MITRE ATT&CK',
  tactic: { id: 'TA0001', name: 'Charlie', reference: 'https://example.com' },
  technique: [],
};
const ATLAS_ROW = {
  framework: 'MITRE ATLAS',
  tactic: { id: 'AML.TA0000', name: 'Atlas Tactic', reference: 'https://atlas.mitre.org/' },
  technique: [],
};
const NONE_TACTIC = { id: 'none', name: 'none', reference: 'none' };

const atlasTactics = [
  buildMockMitreTacticSummary({ id: 'AML.TA0000', name: 'Atlas Tactic', position: 0 }),
  buildMockMitreTacticSummary({ id: 'AML.TA0001', name: 'Atlas Other', position: 1 }),
];

const renderWithValue = (value: unknown, isDisabled = false) => {
  let capturedField: ReturnType<typeof useFormFieldMock<unknown>> | undefined;
  const Component = () => {
    const field = useFormFieldMock<unknown>({ value });
    capturedField = field;
    return (
      <AddMitreAttackThreat
        dataTestSubj="dataTestSubj"
        idAria="idAria"
        isDisabled={isDisabled}
        field={field}
      />
    );
  };
  render(<Component />, { wrapper: TestProviders });
  return capturedField as NonNullable<typeof capturedField>;
};

describe('AddMitreThreat', () => {
  const enterpriseTactics = [
    buildMockMitreTacticSummary({ id: 'TA0001', name: 'Charlie', position: 0 }),
  ];

  const mockByFramework = (
    enterprise: Partial<MitreConfiguration> = {},
    atlas: Partial<MitreConfiguration> = {}
  ) => {
    mockUseMitreConfiguration.mockImplementation((params?: { framework?: string }) =>
      params?.framework === 'atlas'
        ? createPopulatedMitreConfiguration({ tactics: atlasTactics, ...atlas })
        : createPopulatedMitreConfiguration({ tactics: enterpriseTactics, ...enterprise })
    );
  };

  beforeEach(() => {
    mockUseMitreConfiguration.mockReset();
    mockByFramework();
    mockUseAvailableMitreFrameworks.mockReturnValue(['enterprise', 'atlas']);
  });

  it('renders the add tactic button inside the enterprise section', () => {
    renderWithValue([ENTERPRISE_ROW]);

    expect(
      within(screen.getByTestId('mitreFrameworkSection-enterprise')).getByTestId(
        'addMitreAttackTactic'
      )
    ).toBeInTheDocument();
  });

  describe('when the managed MITRE source is off', () => {
    beforeEach(() => {
      mockUseAvailableMitreFrameworks.mockReturnValue(['enterprise']);
    });

    it('disables the add framework button when the enterprise section exists', () => {
      renderWithValue([ENTERPRISE_ROW]);

      expect(screen.getByTestId('addMitreFramework')).toBeDisabled();
      expect(screen.queryByTestId('addMitreFramework-atlas')).not.toBeInTheDocument();
    });

    it('renders an existing ATLAS section as read-only', () => {
      renderWithValue([ENTERPRISE_ROW, ATLAS_ROW]);

      expect(screen.getByTestId('mitreUnavailableFrameworkSection-atlas')).toBeInTheDocument();
    });
  });

  it('renders a loading spinner while MITRE data is loading', () => {
    mockByFramework({ isLoading: true });
    renderWithValue([ENTERPRISE_ROW]);

    expect(screen.getByTestId('mitreAttackLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('addMitreAttackTactic')).not.toBeInTheDocument();
  });

  it('renders an inline error message when MITRE data fails to load', () => {
    mockUseMitreConfiguration.mockReturnValue(createEmptyMitreConfiguration({ isError: true }));
    renderWithValue([ENTERPRISE_ROW]);

    expect(screen.getByTestId('mitreAttackError')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load MITRE ATT&CK data/)).toBeInTheDocument();
    expect(screen.queryByTestId('addMitreAttackTactic')).not.toBeInTheDocument();
  });

  it('renders tactic options in the order provided by the MITRE configuration', async () => {
    mockByFramework({
      tactics: [
        buildMockMitreTacticSummary({ id: 'TA0001', name: 'Charlie', position: 0 }),
        buildMockMitreTacticSummary({ id: 'TA0002', name: 'Bravo', position: 1 }),
        buildMockMitreTacticSummary({ id: 'TA0003', name: 'Alpha', position: 2 }),
      ],
    });
    renderWithValue([{ framework: 'MITRE ATT&CK', tactic: NONE_TACTIC, technique: [] }]);

    await userEvent.click(screen.getByTestId('mitreAttackTactic'));

    const labels = screen
      .getAllByRole('option')
      .map((option) => option.textContent)
      .filter((text) => text != null && !text.includes('Select a tactic'));

    expect(labels).toEqual(['Charlie (TA0001)', 'Bravo (TA0002)', 'Alpha (TA0003)']);
  });

  describe('framework sections', () => {
    it('renders one section per present framework with ATT&CK first', () => {
      renderWithValue([ATLAS_ROW, ENTERPRISE_ROW]);

      const sections = screen.getAllByTestId(/^mitreFrameworkSection-/);
      expect(sections.map((el) => el.getAttribute('data-test-subj'))).toEqual([
        'mitreFrameworkSection-enterprise',
        'mitreFrameworkSection-atlas',
      ]);
    });

    it('renders only the enterprise section for the default value and offers ATLAS to add', async () => {
      renderWithValue(threatDefault);

      expect(screen.getByTestId('mitreFrameworkSection-enterprise')).toBeInTheDocument();
      expect(screen.queryByTestId('mitreFrameworkSection-atlas')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('addMitreFramework'));

      expect(screen.getByTestId('addMitreFramework-atlas')).toBeInTheDocument();
      expect(screen.queryByTestId('addMitreFramework-enterprise')).not.toBeInTheDocument();
    });

    it('renders an empty enterprise section when the value is an empty array', async () => {
      const field = renderWithValue([]);

      const section = screen.getByTestId('mitreFrameworkSection-enterprise');
      expect(screen.queryByTestId('mitreAttackTactic')).not.toBeInTheDocument();
      expect(within(section).getByTestId('removeMitreFramework')).toBeDisabled();

      await userEvent.click(within(section).getByTestId('addMitreAttackTactic'));

      expect(field.setValue).toHaveBeenCalledWith([
        { framework: 'MITRE ATT&CK', tactic: NONE_TACTIC, technique: [] },
      ]);
    });

    it('adds an empty ATLAS row when choosing ATLAS from the add framework menu', async () => {
      const field = renderWithValue([ENTERPRISE_ROW]);

      await userEvent.click(screen.getByTestId('addMitreFramework'));
      // The popover panel has `pointer-events: none` while its open animation runs,
      // which makes userEvent refuse the click; fireEvent bypasses that check.
      fireEvent.click(screen.getByTestId('addMitreFramework-atlas'));

      expect(field.setValue).toHaveBeenCalledWith([
        ENTERPRISE_ROW,
        { framework: 'MITRE ATLAS', tactic: NONE_TACTIC, technique: [] },
      ]);
    });

    it('disables the add framework button when every framework is present', () => {
      renderWithValue([ENTERPRISE_ROW, ATLAS_ROW]);

      expect(screen.getByTestId('addMitreFramework')).toBeDisabled();
    });

    it('removes only the ATLAS rows when removing the ATLAS section', async () => {
      const field = renderWithValue([ENTERPRISE_ROW, ATLAS_ROW]);

      await userEvent.click(
        within(screen.getByTestId('mitreFrameworkSection-atlas')).getByTestId(
          'removeMitreFramework'
        )
      );

      expect(field.setValue).toHaveBeenCalledWith([ENTERPRISE_ROW]);
    });

    it('resets to the default value when removing the last remaining section', async () => {
      const field = renderWithValue([ATLAS_ROW]);

      await userEvent.click(screen.getByTestId('removeMitreFramework'));

      expect(field.setValue).toHaveBeenCalledWith(threatDefault);
    });

    it('uses the ATLAS tactic options in the ATLAS section', async () => {
      renderWithValue([ATLAS_ROW]);

      await userEvent.click(screen.getByTestId('mitreAttackTactic'));

      const labels = screen.getAllByRole('option').map((option) => option.textContent);
      expect(labels).toEqual(['Atlas Tactic (AML.TA0000)', 'Atlas Other (AML.TA0001)']);
    });

    it('includes the framework label in the unsupported id error', () => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
      try {
        renderWithValue([
          { ...ATLAS_ROW, tactic: { id: 'AML.TA9999', name: 'Gone', reference: 'x' } },
        ]);

        expect(
          screen.getByText(/"AML.TA9999" is not in the currently supported MITRE ATLAS version/)
        ).toBeInTheDocument();
      } finally {
        (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
      }
    });
  });

  describe('framework stamping', () => {
    it('keeps MITRE ATLAS when a tactic in the ATLAS section changes', async () => {
      const field = renderWithValue([ATLAS_ROW]);

      await userEvent.click(screen.getByTestId('mitreAttackTactic'));
      await userEvent.click(screen.getByRole('option', { name: /Atlas Other/ }));

      expect(field.setValue).toHaveBeenCalledWith([
        expect.objectContaining({
          framework: 'MITRE ATLAS',
          tactic: expect.objectContaining({ id: 'AML.TA0001', name: 'Atlas Other' }),
          technique: [],
        }),
      ]);
    });

    it('stamps MITRE ATT&CK when a tactic in the enterprise section changes', async () => {
      const field = renderWithValue([
        { framework: 'MITRE ATT&CK', tactic: NONE_TACTIC, technique: [] },
      ]);

      await userEvent.click(screen.getByTestId('mitreAttackTactic'));
      await userEvent.click(screen.getByRole('option', { name: /Charlie/ }));

      expect(field.setValue).toHaveBeenCalledWith([
        expect.objectContaining({ framework: 'MITRE ATT&CK' }),
      ]);
    });

    it('renders a row with an empty framework in the enterprise section and stamps MITRE ATT&CK on change', async () => {
      const field = renderWithValue([{ framework: '', tactic: NONE_TACTIC, technique: [] }]);

      const section = screen.getByTestId('mitreFrameworkSection-enterprise');
      expect(within(section).getByTestId('mitreAttackTactic')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('mitreAttackTactic'));
      await userEvent.click(screen.getByRole('option', { name: /Charlie/ }));

      expect(field.setValue).toHaveBeenCalledWith([
        expect.objectContaining({ framework: 'MITRE ATT&CK' }),
      ]);
    });

    it('pushes a MITRE ATT&CK row when adding a tactic in the enterprise section', async () => {
      const field = renderWithValue([ENTERPRISE_ROW]);

      await userEvent.click(screen.getByTestId('addMitreAttackTactic'));

      expect(field.setValue).toHaveBeenCalledWith([
        ENTERPRISE_ROW,
        { framework: 'MITRE ATT&CK', tactic: NONE_TACTIC, technique: [] },
      ]);
    });

    it('pushes a MITRE ATLAS row when adding a tactic in the ATLAS section', async () => {
      const field = renderWithValue([ENTERPRISE_ROW, ATLAS_ROW]);

      await userEvent.click(
        within(screen.getByTestId('mitreFrameworkSection-atlas')).getByTestId(
          'addMitreAttackTactic'
        )
      );

      expect(field.setValue).toHaveBeenCalledWith([
        ENTERPRISE_ROW,
        ATLAS_ROW,
        { framework: 'MITRE ATLAS', tactic: NONE_TACTIC, technique: [] },
      ]);
    });
  });

  describe('unknown framework', () => {
    const UNKNOWN_ROW = {
      framework: 'Custom Framework',
      tactic: { id: 'X1', name: 'Custom Tactic', reference: 'x' },
      technique: [{ id: 'X1.1', name: 'Custom Technique', reference: 'x', subtechnique: [] }],
    };

    it('renders a read-only section with a warning and no tactic select', () => {
      renderWithValue([UNKNOWN_ROW]);

      const section = screen.getByTestId('mitreUnknownFrameworkSection');
      expect(within(section).getByText('Custom Framework')).toBeInTheDocument();
      expect(within(section).getByText(/not recognized/)).toBeInTheDocument();
      expect(within(section).getByText(/Custom Tactic/)).toBeInTheDocument();
      expect(screen.queryByTestId('mitreAttackTactic')).not.toBeInTheDocument();
    });

    it('removes only the clicked entry', async () => {
      const second = { ...UNKNOWN_ROW, tactic: { id: 'X2', name: 'Second', reference: 'x' } };
      const field = renderWithValue([ENTERPRISE_ROW, UNKNOWN_ROW, second]);

      await userEvent.click(screen.getAllByTestId('removeMitreThreatEntry')[0]);

      expect(field.setValue).toHaveBeenCalledWith([ENTERPRISE_ROW, second]);
    });
  });

  describe('framework unavailable from the data source', () => {
    it('renders a read-only section for ATLAS rows when only enterprise is available', async () => {
      mockUseAvailableMitreFrameworks.mockReturnValue(['enterprise']);
      const field = renderWithValue([ENTERPRISE_ROW, ATLAS_ROW]);

      const section = screen.getByTestId('mitreUnavailableFrameworkSection-atlas');
      expect(within(section).getByText(/not available from the current MITRE/)).toBeInTheDocument();
      expect(within(section).getByText(/Atlas Tactic/)).toBeInTheDocument();
      expect(within(section).queryByTestId('mitreAttackTactic')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mitreFrameworkSection-atlas')).not.toBeInTheDocument();

      await userEvent.click(within(section).getByTestId('removeMitreThreatEntry'));

      expect(field.setValue).toHaveBeenCalledWith([ENTERPRISE_ROW]);
    });
  });
});
