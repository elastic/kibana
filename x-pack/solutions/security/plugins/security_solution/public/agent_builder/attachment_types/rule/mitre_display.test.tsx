/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Threat } from '../../../../common/api/detection_engine/model/rule_schema';
import { MitreAttackDisplay } from './mitre_display';

const fullThreat: Threat = {
  framework: 'MITRE ATT&CK',
  tactic: {
    id: 'TA0001',
    name: 'Initial Access',
    reference: 'https://attack.mitre.org/tactics/TA0001',
  },
  technique: [
    {
      id: 'T1078',
      name: 'Valid Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078',
      subtechnique: [
        {
          id: 'T1078.001',
          name: 'Default Accounts',
          reference: 'https://attack.mitre.org/techniques/T1078/001',
        },
      ],
    },
  ],
};

// Deliberately rendered WITHOUT TestProviders: this component must work inside the
// agent builder chat flyout, which has no Security Solution redux <Provider> or other
// app context. If a change makes these tests need providers, the component would crash
// in production — see the comment in mitre_display.tsx.
describe('MitreAttackDisplay', () => {
  it('renders tactic, technique, and subtechnique links without any app providers', () => {
    render(<MitreAttackDisplay threat={[fullThreat]} />);

    const tactic = screen.getByTestId('mitreTacticLink');
    expect(tactic).toHaveTextContent('Initial Access (TA0001)');
    expect(tactic).toHaveAttribute('href', 'https://attack.mitre.org/tactics/TA0001');

    expect(screen.getByTestId('mitreTechniqueLink')).toHaveTextContent('Valid Accounts (T1078)');
    expect(screen.getByTestId('mitreSubtechniqueLink')).toHaveTextContent(
      'Default Accounts (T1078.001)'
    );
  });

  it('skips null technique and subtechnique entries and renders valid siblings', () => {
    const threat = {
      ...fullThreat,
      technique: [
        null,
        {
          id: 'T1078',
          name: 'Valid Accounts',
          reference: 'https://attack.mitre.org/techniques/T1078',
          subtechnique: [
            null,
            {
              id: 'T1078.001',
              name: 'Default Accounts',
              reference: 'https://attack.mitre.org/techniques/T1078/001',
            },
          ],
        },
      ],
    } as unknown as Threat;
    render(<MitreAttackDisplay threat={[threat]} />);

    expect(screen.getAllByTestId('mitreTechniqueLink')).toHaveLength(1);
    expect(screen.getByTestId('mitreTechniqueLink')).toHaveTextContent('Valid Accounts (T1078)');
    expect(screen.getAllByTestId('mitreSubtechniqueLink')).toHaveLength(1);
    expect(screen.getByTestId('mitreSubtechniqueLink')).toHaveTextContent(
      'Default Accounts (T1078.001)'
    );
  });

  it('renders plain text instead of a link when reference is missing', () => {
    const threat = {
      ...fullThreat,
      tactic: { id: 'TA0001', name: 'Initial Access' },
      technique: undefined,
    } as Threat;
    render(<MitreAttackDisplay threat={[threat]} />);

    const tactic = screen.getByTestId('mitreTacticLink');
    expect(tactic).toHaveTextContent('Initial Access (TA0001)');
    expect(tactic).not.toHaveAttribute('href');
  });

  it('tolerates malformed entries missing tactic', () => {
    const malformed = {
      framework: 'MITRE ATT&CK',
      technique: [{ id: 'T1078', name: 'Valid Accounts', reference: 'https://example.com' }],
    } as unknown as Threat;
    render(<MitreAttackDisplay threat={[malformed]} />);

    expect(screen.queryByTestId('mitreTacticLink')).not.toBeInTheDocument();
    expect(screen.getByTestId('mitreTechniqueLink')).toHaveTextContent('Valid Accounts (T1078)');
  });

  it('renders nothing for an entry with neither tactic nor techniques', () => {
    const empty = { framework: 'MITRE ATT&CK' } as unknown as Threat;
    render(<MitreAttackDisplay threat={[empty]} />);

    expect(screen.queryByTestId('mitreTacticLink')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mitreTechniqueLink')).not.toBeInTheDocument();
  });

  describe('framework grouping', () => {
    const atlasThreat: Threat = {
      framework: 'MITRE ATLAS',
      tactic: {
        id: 'AML.TA0000',
        name: 'Reconnaissance',
        reference: 'https://atlas.mitre.org/tactics/AML.TA0000/',
      },
      technique: [
        {
          id: 'AML.T0044',
          name: 'Full ML Model Access',
          reference: 'https://atlas.mitre.org/techniques/AML.T0044/',
        },
      ],
    };

    it('renders ATT&CK before ATLAS even when ATLAS comes first', () => {
      render(<MitreAttackDisplay threat={[atlasThreat, fullThreat]} />);

      const titles = screen.getAllByTestId('mitreFrameworkGroupTitle');
      expect(titles).toHaveLength(2);
      expect(titles[0]).toHaveTextContent('MITRE ATT&CK');
      expect(titles[1]).toHaveTextContent('MITRE ATLAS');
    });

    it('renders the raw string for an unknown framework', () => {
      const unknown = { ...fullThreat, framework: 'Custom Framework' } as Threat;
      render(<MitreAttackDisplay threat={[unknown]} />);

      const group = screen.getByTestId('mitreFrameworkGroup-unknown');
      expect(group).toHaveTextContent('Custom Framework');
      expect(screen.getByTestId('mitreFrameworkGroupTitle')).toHaveTextContent('Custom Framework');
    });

    it('renders under MITRE ATT&CK when framework is missing', () => {
      const missing = { ...fullThreat, framework: undefined } as unknown as Threat;
      render(<MitreAttackDisplay threat={[missing]} />);

      expect(screen.getByTestId('mitreFrameworkGroupTitle')).toHaveTextContent('MITRE ATT&CK');
    });
  });
});
