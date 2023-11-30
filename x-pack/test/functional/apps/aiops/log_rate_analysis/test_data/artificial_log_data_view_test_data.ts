/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogRateAnalysisType } from '@kbn/aiops-utils';

import type { TestData } from '../../types';

import type { LogRateAnalysisDataGenerator } from '../../../../services/aiops/log_rate_analysis_data_generator';

import { analysisGroupsTableTextfieldZerodocsfallback } from './__mocks__/analysis_groups_table_textfield_zerodocsfallback';
import { analysisGroupsTableZerodocsfallback } from './__mocks__/analysis_groups_table_zerodocsfallback';
import { analysisGroupsTableTextfield } from './__mocks__/analysis_groups_table_textfield';
import { analysisGroupsTable } from './__mocks__/analysis_groups_table';
import { filteredAnalysisGroupsTableTextfieldZerodocsfallback } from './__mocks__/filtered_analysis_groups_table_textfield_zerodocsfallback';
import { filteredAnalysisGroupsTableZerodocsfallback } from './__mocks__/filtered_analysis_groups_table_zerodocsfallback';
import { filteredAnalysisGroupsTableTextfield } from './__mocks__/filtered_analysis_groups_table_textfield';
import { filteredAnalysisGroupsTable } from './__mocks__/filtered_analysis_groups_table';
import { analysisTableTextfieldZerodocsfallback } from './__mocks__/analysis_table_textfield_zerodocsfallback';
import { analysisTableZerodocsfallback } from './__mocks__/analysis_table_zerodocsfallback';
import { analysisTableTextfield } from './__mocks__/analysis_table_textfield';
import { analysisTable } from './__mocks__/analysis_table';

const REFERENCE_TS = 1669018354793;
const DAY_MS = 86400000;

const DEVIATION_TS = REFERENCE_TS - DAY_MS * 2;
const BASELINE_TS = DEVIATION_TS - DAY_MS * 1;

interface GetArtificialLogDataViewTestDataOptions {
  analysisType: LogRateAnalysisType;
  textField: boolean;
  zeroDocsFallback: boolean;
}

export const getArtificialLogDataViewTestData = ({
  analysisType,
  textField,
  zeroDocsFallback,
}: GetArtificialLogDataViewTestDataOptions): TestData => {
  function getAnalysisGroupsTable() {
    if (zeroDocsFallback) {
      return textField
        ? analysisGroupsTableTextfieldZerodocsfallback
        : analysisGroupsTableZerodocsfallback;
    }
    return textField ? analysisGroupsTableTextfield : analysisGroupsTable;
  }

  function getFilteredAnalysisGroupsTable() {
    if (zeroDocsFallback) {
      return textField
        ? filteredAnalysisGroupsTableTextfieldZerodocsfallback
        : filteredAnalysisGroupsTableZerodocsfallback;
    }

    return textField ? filteredAnalysisGroupsTableTextfield : filteredAnalysisGroupsTable;
  }

  function getAnalysisTable() {
    if (zeroDocsFallback) {
      return textField ? analysisTableTextfieldZerodocsfallback : analysisTableZerodocsfallback;
    }

    return textField ? analysisTableTextfield : analysisTable;
  }

  function getFieldSelectorPopover() {
    if (zeroDocsFallback) {
      return [...(textField ? ['message'] : []), 'response_code', 'url', 'user', 'version'];
    }
    return [...(textField ? ['message'] : []), 'response_code', 'url', 'user'];
  }

  function getSuiteTitle() {
    return `artificial logs with ${analysisType} and ${
      textField ? 'text field' : 'no text field'
    } and ${zeroDocsFallback ? 'zero docs fallback' : 'no zero docs fallback'}`;
  }

  function getDataGenerator(): LogRateAnalysisDataGenerator {
    return `artificial_logs_with_${analysisType}${textField ? '_textfield' : ''}${
      zeroDocsFallback ? '_zerodocsfallback' : ''
    }`;
  }

  function getBrushBaselineTargetTimestamp() {
    if (analysisType === 'dip' && zeroDocsFallback) {
      return DEVIATION_TS;
    }

    return zeroDocsFallback ? BASELINE_TS - DAY_MS / 2 : BASELINE_TS + DAY_MS / 2;
  }

  function getBrushDeviationTargetTimestamp() {
    if (analysisType === 'dip' && zeroDocsFallback) {
      return DEVIATION_TS + DAY_MS * 1.5;
    }

    return zeroDocsFallback ? DEVIATION_TS : DEVIATION_TS + DAY_MS / 2;
  }

  return {
    suiteTitle: getSuiteTitle(),
    analysisType,
    dataGenerator: getDataGenerator(),
    isSavedSearch: false,
    sourceIndexOrSavedSearch: getDataGenerator(),
    brushBaselineTargetTimestamp: getBrushBaselineTargetTimestamp(),
    brushDeviationTargetTimestamp: getBrushDeviationTargetTimestamp(),
    brushIntervalFactor: zeroDocsFallback ? 1 : 10,
    chartClickCoordinates: [-200, 30],
    fieldSelectorSearch: 'user',
    fieldSelectorApplyAvailable: true,
    expected: {
      totalDocCountFormatted: zeroDocsFallback ? '9,482' : '8,400',
      analysisGroupsTable: getAnalysisGroupsTable(),
      filteredAnalysisGroupsTable: getFilteredAnalysisGroupsTable(),
      analysisTable: getAnalysisTable(),
      fieldSelectorPopover: getFieldSelectorPopover(),
    },
  };
};
