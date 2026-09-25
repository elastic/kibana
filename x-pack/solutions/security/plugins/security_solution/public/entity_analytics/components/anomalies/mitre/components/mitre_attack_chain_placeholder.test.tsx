/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Verifies that MitreAttackChainPlaceholder always renders a sizing skeleton
 * and its children regardless of MITRE query state.  The bug it guards against:
 * when useMitreConfiguration returns isLoading or isError, the previously-used
 * hidden MitreAttackChain returned null, collapsing the panel.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MitreAttackChainPlaceholder } from './mitre_attack_chain_placeholder';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          danger: '#cc0000',
          subduedText: '#6a6a6a',
          backgroundBasePlain: '#ffffff',
          lightShade: '#d3dae6',
        },
        size: { s: '8px' },
        levels: { content: '100' },
        font: { weight: { bold: 700, semiBold: 600 } },
      },
    }),
  };
});

beforeAll(() => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  }));
});

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('MitreAttackChainPlaceholder', () => {
  it('renders the sizing skeleton dot and children when MITRE is loading', () => {
    // useMitreConfiguration is not called by the placeholder at all after the fix,
    // so no mock is needed — this test confirms the component is query-state-free.
    render(
      <MitreAttackChainPlaceholder>
        <span data-test-subj="child-loading" />
      </MitreAttackChainPlaceholder>,
      { wrapper: Wrapper }
    );

    // The sizing dot is present (aria-hidden, so query by test-id not role).
    expect(screen.getByTestId('mitreInnerCircle')).toBeInTheDocument();
    expect(screen.getByTestId('child-loading')).toBeInTheDocument();
  });

  it('renders the sizing skeleton dot and children when MITRE is in error state', () => {
    render(
      <MitreAttackChainPlaceholder>
        <span data-test-subj="child-error" />
      </MitreAttackChainPlaceholder>,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('mitreInnerCircle')).toBeInTheDocument();
    expect(screen.getByTestId('child-error')).toBeInTheDocument();
  });
});
