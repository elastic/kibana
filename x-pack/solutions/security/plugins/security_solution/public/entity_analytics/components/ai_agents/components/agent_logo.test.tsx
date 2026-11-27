/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiIcon, EuiProvider } from '@elastic/eui';
import { getAgentIconType } from './agent_logo';

describe('getAgentIconType', () => {
  it.each(['claude_code', 'cursor'])('renders a masked product logo for %s', (agentName) => {
    const iconType = getAgentIconType(agentName);
    expect(typeof iconType).toBe('function');

    const { container } = render(
      <EuiProvider>
        <EuiIcon type={iconType} aria-hidden={true} data-test-subj="agentLogo" />
      </EuiProvider>
    );
    const logo = container.querySelector('[data-test-subj="agentLogo"]');
    expect(logo?.tagName).toBe('SPAN');
    expect(logo).not.toHaveAttribute('titleId');
  });

  it('falls back to a generic AI icon for other agents', () => {
    expect(getAgentIconType('copilot')).toBe('sparkles');
  });
});
