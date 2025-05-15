/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';

import { EMPTY_STAT } from '../../constants';
import { alertIndexWithAllResults } from '../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import {
  auditbeatWithAllResults,
  emptyAuditbeatPatternRollup,
} from '../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatNoResults } from '../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../mock/test_providers/test_providers';
import { PatternRollup } from '../../types';
import { Props, IndicesDetails } from '.';
import userEvent from '@testing-library/user-event';
import { HISTORICAL_RESULTS_TOUR_IS_DISMISSED_STORAGE_KEY } from './constants';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

const ilmPhases = ['hot', 'warm', 'unmanaged'];
const patterns = [
  'test-empty-pattern-*',
  '.alerts-security.alerts-default',
  'auditbeat-*',
  'packetbeat-*',
];

const patternRollups: Record<string, PatternRollup> = {
  'test-empty-pattern-*': { ...emptyAuditbeatPatternRollup, pattern: 'test-empty-pattern-*' },
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

const patternIndexNames: Record<string, string[]> = {
  'test-empty-pattern-*': [],
  'auditbeat-*': [
    '.ds-auditbeat-8.6.1-2023.02.07-000001',
    'auditbeat-custom-empty-index-1',
    'auditbeat-custom-index-1',
  ],
  '.alerts-security.alerts-default': ['.internal.alerts-security.alerts-default-000001'],
  'packetbeat-*': [
    '.ds-packetbeat-8.5.3-2023.02.04-000001',
    '.ds-packetbeat-8.6.1-2023.02.04-000001',
  ],
};

const defaultProps: Props = {
  chartSelectedIndex: null,
  setChartSelectedIndex: jest.fn(),
};

describe('IndicesDetails', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.removeItem(HISTORICAL_RESULTS_TOUR_IS_DISMISSED_STORAGE_KEY);

    render(
      <TestExternalProviders>
        <TestDataQualityProviders
          dataQualityContextProps={{ ilmPhases, patterns, formatBytes, formatNumber }}
          resultsRollupContextProps={{ patternRollups, patternIndexNames }}
        >
          <IndicesDetails {...defaultProps} />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    await waitFor(() => {});
  });

  describe('rendering patterns', () => {
    test.each(patterns)('it renders the %s pattern', (pattern) => {
      expect(screen.getByTestId(`${pattern}PatternPanel`)).toBeInTheDocument();
    });
  });

  describe('tour', () => {
    test('it renders the tour wrapping view history button of first row of first non-empty pattern', async () => {
      const wrapper = await screen.findByTestId('historicalResultsTour');
      const button = within(wrapper).getByTestId(
        'viewHistoryAction-.internal.alerts-security.alerts-default-000001'
      );
      expect(button).toHaveAttribute('data-tour-element', patterns[1]);

      expect(screen.getByTestId('historicalResultsTourPanel')).toHaveTextContent(
        'Introducing data quality history'
      );
    });

    describe('when the tour is dismissed', () => {
      test('it hides the tour and persists in localStorage', async () => {
        const wrapper = screen.getByTestId('historicalResultsTourPanel');
        const button = within(wrapper).getByText('Close');
        await userEvent.click(button);

        await waitFor(() => expect(screen.queryByTestId('historicalResultsTour')).toBeNull());

        expect(localStorage.getItem(HISTORICAL_RESULTS_TOUR_IS_DISMISSED_STORAGE_KEY)).toEqual(
          'true'
        );
      });
    });

    describe('when the first pattern is toggled', () => {
      test('it renders the tour wrapping view history button of first row of second non-empty pattern', async () => {
        const firstNonEmptyPatternAccordionWrapper = await screen.findByTestId(
          `${patterns[1]}PatternPanel`
        );
        const accordionToggle = within(firstNonEmptyPatternAccordionWrapper).getByTestId(
          'indexResultBadge'
        );
        await userEvent.click(accordionToggle);

        const secondPatternAccordionWrapper = screen.getByTestId(`${patterns[2]}PatternPanel`);
        const historicalResultsWrapper = await within(secondPatternAccordionWrapper).findByTestId(
          'historicalResultsTour'
        );
        const button = within(historicalResultsWrapper).getByTestId(
          `viewHistoryAction-${patternIndexNames[patterns[2]][0]}`
        );
        expect(button).toHaveAttribute('data-tour-element', patterns[2]);

        expect(screen.getByTestId('historicalResultsTourPanel')).toBeInTheDocument();
      });
    });
  });
});
