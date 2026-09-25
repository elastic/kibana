/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  MitreTacticSummary,
  MitreTechniqueSummary,
  MitreSubtechniqueSummary,
} from '@kbn/security-mitre-attack-common';
import { TestProviders } from '../../../../common/mock';
import { ThreatEuiFlexGroup } from './threat_description';

// Warning icons are gated behind the mitreAttackUpdatesUIEnabled feature flag,
// which is off by default. Force it on for this test suite.
jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

const mockUseMitreConfiguration = jest.fn();
jest.mock('../../../../common/hooks/mitre/use_mitre_configuration', () => ({
  useMitreConfiguration: (...args: unknown[]) => mockUseMitreConfiguration(...args),
}));

const BASE = {
  framework: 'enterprise' as const,
  framework_version: '16.1',
  revoked: false,
  deprecated: false,
};

const testTactics: MitreTacticSummary[] = [
  {
    ...BASE,
    type: 'tactic',
    id: 'TA0005',
    name: 'Defense Evasion',
    reference: 'https://attack.mitre.org/tactics/TA0005/',
    position: 0,
  },
];

const testTechniques: MitreTechniqueSummary[] = [
  {
    ...BASE,
    type: 'technique',
    id: 'T1548',
    name: 'Abuse Elevation Control Mechanism',
    reference: 'https://attack.mitre.org/techniques/T1548/',
    tactic_ids: ['TA0005'],
  },
];

const testSubtechniques: MitreSubtechniqueSummary[] = [
  {
    ...BASE,
    type: 'subtechnique',
    id: 'T1548.002',
    name: 'Bypass User Account Control',
    reference: 'https://attack.mitre.org/techniques/T1548/002/',
    tactic_ids: ['TA0005'],
    technique_id: 'T1548',
  },
];

const MITRE_FRAMEWORK = 'MITRE ATT&CK';

const renderThreat = (threat: Threats) =>
  render(
    <TestProviders>
      <ThreatEuiFlexGroup threat={threat} />
    </TestProviders>
  );

beforeEach(() => {
  mockUseMitreConfiguration.mockReturnValue({
    tactics: testTactics,
    techniques: testTechniques,
    subtechniques: testSubtechniques,
    frameworkVersion: '16.1',
    isLoading: false,
    isError: false,
  });
});

describe('ThreatEuiFlexGroup', () => {
  it('renders no warning when every tactic, technique, and subtechnique is in the dataset', async () => {
    const threat: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: 'TA0005',
          name: 'Defense Evasion',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [
          {
            id: 'T1548',
            name: 'Abuse Elevation Control Mechanism',
            reference: 'https://attack.mitre.org/techniques/T1548/',
            subtechnique: [
              {
                id: 'T1548.002',
                name: 'Bypass User Account Control',
                reference: 'https://attack.mitre.org/techniques/T1548/002/',
              },
            ],
          },
        ],
      },
    ];

    renderThreat(threat);

    expect(await screen.findByText('Defense Evasion (TA0005)')).toBeInTheDocument();
    expect(screen.queryByTestId('threatUnsupportedMitreIdWarning-TA0005')).not.toBeInTheDocument();
    expect(screen.queryByTestId('threatUnsupportedMitreIdWarning-T1548')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('threatUnsupportedMitreIdWarning-T1548.002')
    ).not.toBeInTheDocument();
  });

  it('renders a warning icon next to an unsupported tactic id', async () => {
    const threat: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: 'TA9999',
          name: 'Outdated Tactic',
          reference: 'https://example.com/ta9999',
        },
        technique: [],
      },
    ];

    renderThreat(threat);

    expect(await screen.findByTestId('threatUnsupportedMitreIdWarning-TA9999')).toBeInTheDocument();
  });

  it('renders a warning icon next to an unsupported technique id', async () => {
    const threat: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: 'TA0005',
          name: 'Defense Evasion',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [
          {
            id: 'T9999',
            name: 'Outdated Technique',
            reference: 'https://example.com/t9999',
          },
        ],
      },
    ];

    renderThreat(threat);

    expect(await screen.findByTestId('threatUnsupportedMitreIdWarning-T9999')).toBeInTheDocument();
    expect(screen.queryByTestId('threatUnsupportedMitreIdWarning-TA0005')).not.toBeInTheDocument();
  });

  it('renders a warning icon next to an unsupported subtechnique id', async () => {
    const threat: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: 'TA0005',
          name: 'Defense Evasion',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [
          {
            id: 'T1548',
            name: 'Abuse Elevation Control Mechanism',
            reference: 'https://attack.mitre.org/techniques/T1548/',
            subtechnique: [
              {
                id: 'T1548.999',
                name: 'Outdated Subtechnique',
                reference: 'https://example.com/sub',
              },
            ],
          },
        ],
      },
    ];

    renderThreat(threat);

    expect(
      await screen.findByTestId('threatUnsupportedMitreIdWarning-T1548.999')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('threatUnsupportedMitreIdWarning-T1548')).not.toBeInTheDocument();
  });

  it('does not show warnings when the hook returns empty data with isLoading:false and isError:false (managed source not yet populated)', async () => {
    // Simulate the managed source returning empty arrays with isLoading:false, isError:false —
    // ensureInitialized() is false so the server returns a 200 with no entities yet.
    mockUseMitreConfiguration.mockReturnValue({
      tactics: [],
      techniques: [],
      subtechniques: [],
      frameworkVersion: undefined,
      isLoading: false,
      isError: false,
    });

    const threat: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: 'TA0005',
          name: 'Defense Evasion',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [
          {
            id: 'T1548',
            name: 'Abuse Elevation Control Mechanism',
            reference: 'https://attack.mitre.org/techniques/T1548/',
          },
        ],
      },
    ];

    const { container } = renderThreat(threat);

    // tactics.length is 0, so showUnsupportedWarnings is false — no warnings should render.
    expect(
      container.querySelector('[data-test-subj^="threatUnsupportedMitreIdWarning-"]')
    ).toBeNull();
  });

  it('does not show false-positive warnings before the MITRE dataset has loaded', async () => {
    // Simulate loading state: hook returns empty arrays with isLoading true.
    mockUseMitreConfiguration.mockReturnValue({
      tactics: [],
      techniques: [],
      subtechniques: [],
      frameworkVersion: undefined,
      isLoading: true,
      isError: false,
    });

    const threat: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: 'TA0005',
          name: 'Defense Evasion',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [],
      },
    ];

    const { container } = renderThreat(threat);

    // While loading, showUnsupportedWarnings is false so no warnings render.
    expect(
      container.querySelector('[data-test-subj^="threatUnsupportedMitreIdWarning-"]')
    ).toBeNull();
  });

  it('does not show warnings when data is loaded and the tactic is supported', async () => {
    const threat: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: 'TA0005',
          name: 'Defense Evasion',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [],
      },
    ];

    renderThreat(threat);

    await waitFor(() => expect(screen.getByText('Defense Evasion (TA0005)')).toBeInTheDocument());
    expect(screen.queryByTestId('threatUnsupportedMitreIdWarning-TA0005')).not.toBeInTheDocument();
  });

  it('does not throw when technique contains a null hole and still renders valid siblings', async () => {
    const threat = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: 'TA0005',
          name: 'Defense Evasion',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [
          null,
          {
            id: 'T1548',
            name: 'Abuse Elevation Control Mechanism',
            reference: 'https://attack.mitre.org/techniques/T1548/',
          },
        ],
      },
    ] as Threats;

    renderThreat(threat);

    expect(await screen.findByText('Defense Evasion (TA0005)')).toBeInTheDocument();
    expect(
      await screen.findByText('Abuse Elevation Control Mechanism (T1548)')
    ).toBeInTheDocument();
  });

  it('does not throw when a threat entry is missing tactic', async () => {
    const threat = [
      {
        framework: MITRE_FRAMEWORK,
        technique: [
          {
            id: 'T1548',
            name: 'Abuse Elevation Control Mechanism',
            reference: 'https://attack.mitre.org/techniques/T1548/',
          },
        ],
      },
    ] as Threats;

    const { container } = renderThreat(threat);

    await waitFor(() => {
      expect(container.querySelector('[data-test-subj="threatTechniqueLink"]')).not.toBeNull();
    });
    expect(container.querySelector('[data-test-subj="threatTacticLink"]')).toBeNull();
    expect(container.textContent).toContain('Abuse Elevation Control Mechanism');
  });

  it('does not throw when the threat array contains a null hole and still renders valid siblings', async () => {
    const threat = [
      null,
      {
        framework: MITRE_FRAMEWORK,
        tactic: {
          id: 'TA0005',
          name: 'Defense Evasion',
          reference: 'https://attack.mitre.org/tactics/TA0005/',
        },
        technique: [
          {
            id: 'T1548',
            name: 'Abuse Elevation Control Mechanism',
            reference: 'https://attack.mitre.org/techniques/T1548/',
          },
        ],
      },
    ] as Threats;

    renderThreat(threat);

    expect(await screen.findByText('Defense Evasion (TA0005)')).toBeInTheDocument();
    expect(
      await screen.findByText('Abuse Elevation Control Mechanism (T1548)')
    ).toBeInTheDocument();
  });
});
