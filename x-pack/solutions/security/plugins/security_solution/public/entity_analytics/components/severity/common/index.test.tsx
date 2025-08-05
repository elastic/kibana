/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, renderHook } from '@testing-library/react';
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme'; // eslint-disable-line @elastic/eui/no-restricted-eui-imports

import { TestProviders } from '../../../../common/mock';

import type { EuiHealthProps } from '@elastic/eui';
import { EuiHealth, useEuiTheme } from '@elastic/eui';

import { RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreLevel } from '.';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...jest.requireActual('@elastic/eui'),
    EuiHealth: jest.fn((props: EuiHealthProps) => <original.EuiHealth {...props} />),
  };
});

describe('RiskScore', () => {
  const context = {};
  it('renders critical severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.Critical} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(RiskSeverity.Critical);
    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorSeverityDanger }),
      {}
    );
  });

  it('renders hight severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.High} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(RiskSeverity.High);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorSeverityRisk }),
      context
    );
  });

  it('renders moderate severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.Moderate} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(RiskSeverity.Moderate);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorSeverityWarning }),
      context
    );
  });

  it('renders low severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.Low} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(RiskSeverity.Low);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorSeverityNeutral }),
      context
    );
  });

  it('renders unknown severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.Unknown} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(RiskSeverity.Unknown);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorSeverityUnknown }),
      context
    );
  });

  it("doesn't render background-color when hideBackgroundColor is true", () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.Critical} hideBackgroundColor />
      </TestProviders>
    );

    expect(queryByTestId('risk-score')).not.toHaveStyleRule('background-color');
  });

  it('renders background-color when hideBackgroundColor is false', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.Critical} />
      </TestProviders>
    );

    const { result } = renderHook(() => useEuiTheme());

    expect(queryByTestId('risk-score')).toHaveStyleRule(
      'background-color',
      result.current.euiTheme.colors.backgroundBaseDanger
    );
  });
});
