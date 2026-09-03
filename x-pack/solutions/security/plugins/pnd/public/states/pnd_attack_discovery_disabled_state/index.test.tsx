/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ATTACK_DISCOVERY_WORKFLOWS_UI_SETTING, PndAttackDiscoveryDisabledState } from '.';

describe('PndAttackDiscoveryDisabledState', () => {
  it('renders the disabled state', () => {
    render(<PndAttackDiscoveryDisabledState />);

    expect(screen.getByTestId('pndAttackDiscoveryDisabledState')).toBeInTheDocument();
  });

  it('names the per-space ui setting the reader must turn on', () => {
    render(<PndAttackDiscoveryDisabledState />);

    expect(screen.getByText(ATTACK_DISCOVERY_WORKFLOWS_UI_SETTING)).toBeInTheDocument();
  });

  it('pins the ui setting key, because the loop silently never starts without it', () => {
    expect(ATTACK_DISCOVERY_WORKFLOWS_UI_SETTING).toBe(
      'securitySolution:enableAttackDiscoveryWorkflows'
    );
  });
});
