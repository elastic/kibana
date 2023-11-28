/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogRateAnalysisType } from '@kbn/aiops-utils';

import type { TestData } from '../../types';

import type { LogRateAnalysisDataGenerator } from '../../../../services/aiops/log_rate_analysis_data_generator';

import { analysisGroupsTableTextfieldGaps } from './__mocks__/analysis_groups_table_textfield_gaps';
import { analysisGroupsTableNotextfieldGaps } from './__mocks__/analysis_groups_table_notextfield_gaps';
import { analysisGroupsTableTextfieldNogaps } from './__mocks__/analysis_groups_table_textfield_nogaps';
import { analysisGroupsTableNotextfieldNogaps } from './__mocks__/analysis_groups_table_notextfield_nogaps';
import { filteredAnalysisGroupsTableTextfieldGaps } from './__mocks__/filtered_analysis_groups_table_textfield_gaps';
import { filteredAnalysisGroupsTableNotextfieldGaps } from './__mocks__/filtered_analysis_groups_table_notextfield_gaps';
import { filteredAnalysisGroupsTableTextfieldNogaps } from './__mocks__/filtered_analysis_groups_table_textfield_nogaps';
import { filteredAnalysisGroupsTableNotextfieldNogaps } from './__mocks__/filtered_analysis_groups_table_notextfield_nogaps';
import { analysisTableTextfieldGaps } from './__mocks__/analysis_table_textfield_gaps';
import { analysisTableNotextfieldGaps } from './__mocks__/analysis_table_notextfield_gaps';
import { analysisTableTextfieldNogaps } from './__mocks__/analysis_table_textfield_nogaps';
import { analysisTableNotextfieldNogaps } from './__mocks__/analysis_table_notextfield_nogaps';

const REFERENCE_TS = 1669018354793;
const DAY_MS = 86400000;

const DEVIATION_TS = REFERENCE_TS - DAY_MS * 2;
const BASELINE_TS = DEVIATION_TS - DAY_MS * 1;

interface GetArtificialLogDataViewTestDataOptions {
  analysisType: LogRateAnalysisType;
  textField: boolean;
  gaps: boolean;
}

export const getArtificialLogDataViewTestData = ({
  analysisType,
  textField,
  gaps,
}: GetArtificialLogDataViewTestDataOptions): TestData => {
  function getAnalysisGroupsTable() {
    if (gaps) {
      return textField ? analysisGroupsTableTextfieldGaps : analysisGroupsTableNotextfieldGaps;
    }
    return textField ? analysisGroupsTableTextfieldNogaps : analysisGroupsTableNotextfieldNogaps;
  }

  function getFilteredAnalysisGroupsTable() {
    if (gaps) {
      return textField
        ? filteredAnalysisGroupsTableTextfieldGaps
        : filteredAnalysisGroupsTableNotextfieldGaps;
    }

    return textField
      ? filteredAnalysisGroupsTableTextfieldNogaps
      : filteredAnalysisGroupsTableNotextfieldNogaps;
  }

  function getAnalysisTable() {
    if (gaps) {
      return textField ? analysisTableTextfieldGaps : analysisTableNotextfieldGaps;
    }

    return textField ? analysisTableTextfieldNogaps : analysisTableNotextfieldNogaps;
  }

  function getFieldSelectorPopover() {
    if (gaps) {
      return [...(textField ? ['message'] : []), 'response_code', 'url', 'user', 'version'];
    }
    return [...(textField ? ['message'] : []), 'response_code', 'url', 'user'];
  }

  function getSuiteTitle() {
    return `artificial logs with ${analysisType} and ${
      textField ? 'text field' : 'no text field'
    } and ${gaps ? 'gaps' : 'no gaps'}`;
  }

  function getDataGenerator(): LogRateAnalysisDataGenerator {
    return `artificial_logs_with_${analysisType}_${textField ? 'textfield' : 'notextfield'}_${
      gaps ? 'gaps' : 'nogaps'
    }`;
  }

  function getBrushBaselineTargetTimestamp() {
    return gaps ? BASELINE_TS - DAY_MS / 2 : BASELINE_TS + DAY_MS / 2;
  }

  function getBrushDeviationTargetTimestamp() {
    return gaps ? DEVIATION_TS : DEVIATION_TS + DAY_MS / 2;
  }

  return {
    suiteTitle: getSuiteTitle(),
    analysisType,
    dataGenerator: getDataGenerator(),
    isSavedSearch: false,
    sourceIndexOrSavedSearch: getDataGenerator(),
    brushBaselineTargetTimestamp: getBrushBaselineTargetTimestamp(),
    brushDeviationTargetTimestamp: getBrushDeviationTargetTimestamp(),
    brushIntervalFactor: gaps ? 1 : 10,
    chartClickCoordinates: [-200, 30],
    fieldSelectorSearch: 'user',
    fieldSelectorApplyAvailable: true,
    expected: {
      totalDocCountFormatted: gaps ? '9,482' : '8,400',
      analysisGroupsTable: getAnalysisGroupsTable(),
      filteredAnalysisGroupsTable: getFilteredAnalysisGroupsTable(),
      analysisTable: getAnalysisTable(),
      fieldSelectorPopover: getFieldSelectorPopover(),
    },
  };
};
