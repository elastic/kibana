/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { EMPTY_STAT } from '../constants';
import { alertIndexWithAllResults } from '../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { auditbeatWithAllResults } from '../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatNoResults } from '../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../mock/test_providers/test_providers';
import { PatternRollup } from '../types';
import { DataQualitySummary } from '.';
import {
  getTotalDocsCount,
  getTotalIncompatible,
  getTotalIndices,
  getTotalIndicesChecked,
  getTotalSizeInBytes,
} from '../hooks/use_results_rollup/utils/stats';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const defaultNumberFormat = '0,0.[000]';
const formatNumber = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT;

const ilmPhases = ['hot', 'warm', 'unmanaged'];
const patterns = ['.alerts-security.alerts-default', 'auditbeat-*', 'packetbeat-*'];

const patternRollups: Record<string, PatternRollup> = {
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

const patternIndexNames: Record<string, string[]> = {
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

const lastChecked = '2023-03-28T23:27:28.159Z';

const totalDocsCount = getTotalDocsCount(patternRollups);
const totalIncompatible = getTotalIncompatible(patternRollups);
const totalIndices = getTotalIndices(patternRollups);
const totalIndicesChecked = getTotalIndicesChecked(patternRollups);
const totalSizeInBytes = getTotalSizeInBytes(patternRollups);

describe('DataQualitySummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    render(
      <TestExternalProviders>
        <TestDataQualityProviders
          dataQualityContextProps={{
            formatBytes,
            formatNumber,
            ilmPhases,
            lastChecked,
            patterns,
          }}
          resultsRollupContextProps={{
            patternIndexNames,
            patternRollups,
            totalDocsCount,
            totalIncompatible,
            totalIndices,
            totalIndicesChecked,
            totalSizeInBytes,
          }}
        >
          <DataQualitySummary />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );
  });

  test('it renders the summary actions', () => {
    expect(screen.getByTestId('summaryActions')).toBeInTheDocument();
  });

  test('it renders the stats rollup', () => {
    expect(screen.getByTestId('statsRollup')).toBeInTheDocument();
  });
});
