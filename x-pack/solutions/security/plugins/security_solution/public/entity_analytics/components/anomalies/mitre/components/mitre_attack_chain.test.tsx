/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MitreAttackChain } from './mitre_attack_chain';
import {
  createEmptyMitreConfiguration,
  createPopulatedMitreConfiguration,
} from '../../../../../common/hooks/mitre/use_mitre_configuration.mock';
import type { MitreConfiguration } from '../../../../../common/hooks/mitre/use_mitre_configuration';

// ─── Hook mocks ───────────────────────────────────────────────────────────────

const mockUseMitreConfiguration = jest.fn<MitreConfiguration, [string[]?]>();

jest.mock('../../../../../common/hooks/mitre/use_mitre_configuration', () => ({
  useMitreConfiguration: (types?: string[]) => mockUseMitreConfiguration(types),
}));

// Capture rendered tactic names for ordering assertions.
const renderedTacticNames: string[] = [];

jest.mock('./mitre_tactic_dot', () => ({
  MitreTacticDot: ({
    tactic,
    detected,
    onClick,
    isSelected,
  }: {
    tactic: string;
    detected: boolean;
    onClick?: () => void;
    isSelected?: boolean;
  }) => {
    renderedTacticNames.push(tactic);
    if (onClick) {
      return (
        <button
          type="button"
          data-test-subj={`mitre-tactic-dot-${tactic}`}
          data-detected={String(detected)}
          data-selected={String(Boolean(isSelected))}
          onClick={onClick}
        />
      );
    }
    return (
      <div
        data-test-subj={`mitre-tactic-dot-${tactic}`}
        data-detected={String(detected)}
        data-selected={String(Boolean(isSelected))}
      />
    );
  },
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({
      euiTheme: { colors: {}, font: { weight: {} }, size: {}, levels: {} },
    }),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const makeTactic = (
  id: string,
  name: string,
  position: number
): MitreConfiguration['tactics'][number] => ({
  type: 'tactic',
  framework: 'enterprise',
  framework_version: '16.1',
  id,
  name,
  reference: `https://attack.mitre.org/tactics/${id}/`,
  revoked: false,
  deprecated: false,
  position,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MitreAttackChain', () => {
  beforeEach(() => {
    mockUseMitreConfiguration.mockReturnValue(createPopulatedMitreConfiguration());
    renderedTacticNames.length = 0;
  });

  it('passes types=[tactic] to useMitreConfiguration', () => {
    render(<MitreAttackChain triggeredTactics={[]} />, { wrapper: Wrapper });
    expect(mockUseMitreConfiguration).toHaveBeenCalledWith(['tactic']);
  });

  describe('basic structure', () => {
    it('renders one dot per tactic returned by the hook', () => {
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({
          tactics: [
            makeTactic('TA0001', 'Initial Access', 0),
            makeTactic('TA0002', 'Execution', 1),
          ],
        })
      );
      render(<MitreAttackChain triggeredTactics={[]} />, { wrapper: Wrapper });
      expect(screen.getByTestId('mitre-tactic-dot-Initial Access')).toBeInTheDocument();
      expect(screen.getByTestId('mitre-tactic-dot-Execution')).toBeInTheDocument();
    });

    it('renders no dots when tactics list is empty (MITRE loading or error)', () => {
      mockUseMitreConfiguration.mockReturnValue(createEmptyMitreConfiguration());
      render(<MitreAttackChain triggeredTactics={[]} />, { wrapper: Wrapper });
      expect(screen.queryByTestId(/^mitre-tactic-dot-/)).not.toBeInTheDocument();
    });
  });

  describe('detection', () => {
    it('marks a tactic as detected when its name is in triggeredTactics', () => {
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({
          tactics: [
            makeTactic('TA0001', 'Initial Access', 0),
            makeTactic('TA0002', 'Execution', 1),
          ],
        })
      );
      render(<MitreAttackChain triggeredTactics={['Initial Access']} />, { wrapper: Wrapper });
      expect(screen.getByTestId('mitre-tactic-dot-Initial Access')).toHaveAttribute(
        'data-detected',
        'true'
      );
      expect(screen.getByTestId('mitre-tactic-dot-Execution')).toHaveAttribute(
        'data-detected',
        'false'
      );
    });
  });

  describe('interactivity', () => {
    it('calls onSelectTactic with the tactic name when a detected dot is clicked', () => {
      const onSelectTactic = jest.fn();
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({
          tactics: [makeTactic('TA0001', 'Initial Access', 0)],
        })
      );
      render(
        <MitreAttackChain triggeredTactics={['Initial Access']} onSelectTactic={onSelectTactic} />,
        { wrapper: Wrapper }
      );
      fireEvent.click(screen.getByTestId('mitre-tactic-dot-Initial Access'));
      expect(onSelectTactic).toHaveBeenCalledWith('Initial Access');
    });

    it('shows the selected state when selectedTactic matches a tactic', () => {
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({
          tactics: [
            makeTactic('TA0001', 'Initial Access', 0),
            makeTactic('TA0002', 'Execution', 1),
          ],
        })
      );
      render(
        <MitreAttackChain
          triggeredTactics={['Initial Access', 'Execution']}
          selectedTactic="Execution"
        />,
        { wrapper: Wrapper }
      );
      expect(screen.getByTestId('mitre-tactic-dot-Execution')).toHaveAttribute(
        'data-selected',
        'true'
      );
      expect(screen.getByTestId('mitre-tactic-dot-Initial Access')).toHaveAttribute(
        'data-selected',
        'false'
      );
    });
  });

  describe('tactic ordering', () => {
    it('renders dots in ascending position order regardless of hook return order', () => {
      mockUseMitreConfiguration.mockReturnValue(
        createEmptyMitreConfiguration({
          tactics: [
            // Intentionally out of position order to verify sorting
            makeTactic('TA0003', 'Persistence', 2),
            makeTactic('TA0001', 'Initial Access', 0),
            makeTactic('TA0002', 'Execution', 1),
          ],
        })
      );
      render(<MitreAttackChain triggeredTactics={[]} />, { wrapper: Wrapper });
      expect(renderedTacticNames).toEqual(['Initial Access', 'Execution', 'Persistence']);
    });
  });

  describe('graceful error handling', () => {
    it('renders without crashing when MITRE is in an error state', () => {
      mockUseMitreConfiguration.mockReturnValue(createEmptyMitreConfiguration({ isError: true }));
      expect(() =>
        render(<MitreAttackChain triggeredTactics={['Initial Access']} />, { wrapper: Wrapper })
      ).not.toThrow();
    });

    it('renders without crashing when MITRE is loading', () => {
      mockUseMitreConfiguration.mockReturnValue(createEmptyMitreConfiguration({ isLoading: true }));
      expect(() =>
        render(<MitreAttackChain triggeredTactics={[]} />, { wrapper: Wrapper })
      ).not.toThrow();
    });
  });
});
