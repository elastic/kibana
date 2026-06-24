/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';

import { AddMitreAttackThreat } from '.';
import { TestProviders, useFormFieldMock } from '../../../../common/mock';

jest.mock('../../../../../common/detection_engine/mitre/mitre_tactics_techniques', () => ({
  tactics: [
    {
      name: 'Tactic 1',
      id: 'TA001',
      reference: 'https://example.com/TA001',
      label: 'Tactic 1',
      value: 'tactic1',
    },
  ],
  techniques: [
    {
      name: 'Technique 1',
      id: 'T001',
      reference: 'https://example.com/T001',
      tactics: ['tactic-1'],
      label: 'Technique 1',
      value: 'technique1',
    },
  ],
  subtechniques: [
    {
      name: 'Subtechnique 1',
      id: 'T001.001',
      reference: 'https://example.com/T001/001',
      tactics: ['tactic-1'],
      techniqueId: 'T001',
      label: 'Subtechnique 1',
      value: 'subtechnique1',
    },
  ],
}));

const MITRE_FRAMEWORK = 'MITRE ATT&CK';

const renderWithThreats = (threats: Threats) => {
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

describe('AddMitreAttackThreat - unsupported MITRE ID highlighting', () => {
  it('does not highlight anything when all referenced IDs are supported', async () => {
    const threats: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: { id: 'TA001', name: 'Tactic 1', reference: '' },
        technique: [
          {
            id: 'T001',
            name: 'Technique 1',
            reference: '',
            subtechnique: [{ id: 'T001.001', name: 'Subtechnique 1', reference: '' }],
          },
        ],
      },
    ];

    renderWithThreats(threats);

    // wait for the lazy MITRE dataset load to settle before asserting absence
    await waitFor(() => {
      expect(screen.queryByText(/not in the currently supported MITRE/)).toBeNull();
    });
    expect(screen.queryByText(/\(unsupported\)/)).toBeNull();
  });

  it('renders a ghost option and form-row error when the tactic ID is unsupported', async () => {
    const threats: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: { id: 'TA9999', name: 'Fake Tactic', reference: '' },
        technique: [],
      },
    ];

    renderWithThreats(threats);

    expect(await screen.findByText('TA9999 (unsupported)')).toBeInTheDocument();
    expect(
      await screen.findByText(/"TA9999" is not in the currently supported MITRE/)
    ).toBeInTheDocument();
  });

  it('renders a ghost option and form-row error when the technique ID is unsupported', async () => {
    const threats: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: { id: 'TA001', name: 'Tactic 1', reference: '' },
        technique: [
          {
            id: 'T9999',
            name: 'Fake Technique',
            reference: '',
          },
        ],
      },
    ];

    renderWithThreats(threats);

    expect(await screen.findByText('T9999 (unsupported)')).toBeInTheDocument();
    expect(
      await screen.findByText(/"T9999" is not in the currently supported MITRE/)
    ).toBeInTheDocument();
  });

  it('renders a ghost option and form-row error when the subtechnique ID is unsupported', async () => {
    const threats: Threats = [
      {
        framework: MITRE_FRAMEWORK,
        tactic: { id: 'TA001', name: 'Tactic 1', reference: '' },
        technique: [
          {
            id: 'T001',
            name: 'Technique 1',
            reference: '',
            subtechnique: [{ id: 'T001.999', name: 'Fake Subtechnique', reference: '' }],
          },
        ],
      },
    ];

    renderWithThreats(threats);

    expect(await screen.findByText('T001.999 (unsupported)')).toBeInTheDocument();
    expect(
      await screen.findByText(/"T001.999" is not in the currently supported MITRE/)
    ).toBeInTheDocument();
  });
});
