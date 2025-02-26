/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { HistoricalResult as HistoricalResultType } from '../../../../../../../types';
import { IndexStatsPanel } from '../../../index_stats_panel';
import { HistoricalCheckFields } from './historical_check_fields';
// eslint-disable-next-line no-restricted-imports
import { isNonLegacyHistoricalResult } from './utils/is_non_legacy_historical_result';
// eslint-disable-next-line no-restricted-imports
import { LegacyHistoricalCheckFields } from './legacy_historical_check_fields';

export interface Props {
  indexName: string;
  historicalResult: HistoricalResultType;
  checkedAt: number;
}

const HistoricalResultComponent: React.FC<Props> = ({ checkedAt, indexName, historicalResult }) => {
  const {
    docsCount,
    sizeInBytes,
    ilmPhase,
    ecsFieldCount,
    totalFieldCount,
    customFieldCount,
    checkedAt: checkedAtNumeric,
  } = historicalResult;

  return (
    <div data-test-subj={`historicalResult-${checkedAtNumeric}`}>
      <EuiSpacer />
      <IndexStatsPanel
        docsCount={docsCount}
        sizeInBytes={sizeInBytes ?? 0}
        ilmPhase={ilmPhase}
        ecsCompliantFieldsCount={ecsFieldCount}
        customFieldsCount={customFieldCount}
        allFieldsCount={totalFieldCount}
      />
      <EuiSpacer />
      {isNonLegacyHistoricalResult(historicalResult) ? (
        <HistoricalCheckFields
          checkedAt={checkedAt}
          indexName={indexName}
          historicalResult={historicalResult}
        />
      ) : (
        <LegacyHistoricalCheckFields
          checkedAt={checkedAt}
          indexName={indexName}
          historicalResult={historicalResult}
        />
      )}
      <EuiSpacer size="m" />
    </div>
  );
};

HistoricalResultComponent.displayName = 'HistoricalResultComponent';

export const HistoricalResult = React.memo(HistoricalResultComponent);
