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
});
