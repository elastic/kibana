/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { HORIZONTAL_LINE } from '../../common/constants';
import { getElapsedTime } from '../../../../common/endpoint/data_loaders/utils';
import type {
  ProgressReporterInterface,
  ProgressReporterState,
  ReportProgressCallback,
} from './types';

const NOOP = () => {};

interface ProgressReporterOptions {
  /**
   * If defined, this callback to be used in reporting status on an interval until
   * the `doneCount` reaches the `totalCount` of all categories
   * @param status
   */
  reportStatus?: (status: string) => void;
}

export class ProgressReporter implements ProgressReporterInterface {
  private readonly reportIntervalMs = 20000;
  private readonly startedAt: Date = new Date();
  private categories: Record<
    string,
    { totalCount: number; doneCount: number; errorCount: number }
  > = {};
  private stopReportingLoop: () => void = NOOP;

  constructor(private readonly options: ProgressReporterOptions = {}) {
    if (options.reportStatus) {
      this.startReporting();
    }
  }

  public startReporting() {
    this.stopReportingLoop();

    if (!this.options.reportStatus) {
      return;
    }

    const setIntId = setInterval(() => {
      if (this.options.reportStatus) {
        this.options.reportStatus(this.getStatus());

        if (this.getState().prctDone === 100) {
          this.stopReportingLoop();
        }
      }
    }, this.reportIntervalMs);

    const exitEvCallback = () => this.stopReportingLoop();

    this.stopReportingLoop = once(() => {
      clearInterval(setIntId);
      process.off('exit', exitEvCallback);
    });

    process.on('exit', exitEvCallback);
  }

  stopReporting() {
    this.stopReportingLoop();

    if (this.options.reportStatus) {
      this.options.reportStatus(this.getStatus());
    }
  }

  addCategory(name: string, totalCount: number): ReportProgressCallback {
    this.categories[name] = {
      totalCount,
      doneCount: 0,
      errorCount: 0,
    };

    this.startReporting();
    return this.getReporter(name);
  }

  getReporter(categoryName: string): ReportProgressCallback {
    if (!this.categories[categoryName]) {
      throw new Error(`category name [${categoryName}] has not known`);
    }

    return (options) => {
      this.categories[categoryName].doneCount = options.doneCount;
    };
  }

  getState(): ProgressReporterState {
    const state: ProgressReporterState = {
      prctDone: 0,
      totalCount: 0,
      doneCount: 0,
      errorCount: 0,
      categories: {},
    };

    Object.entries(this.categories).forEach(
      ([
        categoryName,
        {
          totalCount: thisCategoryTotalCount,
          doneCount: thisCategoryDoneCount,
          errorCount: thisCategoryErrorCount,
        },
      ]) => {
        state.totalCount += thisCategoryTotalCount;
        state.doneCount += thisCategoryDoneCount;
        state.errorCount += thisCategoryErrorCount;

        state.categories[categoryName] = {
          totalCount: thisCategoryTotalCount,
          doneCount: thisCategoryDoneCount,
          errorCount: thisCategoryErrorCount,
          prctDone: calculatePercentage(thisCategoryTotalCount, thisCategoryDoneCount),
        };
      }
    );

    state.prctDone = calculatePercentage(state.totalCount, state.doneCount);

    return state;
  }

  getStatus(): string {
    const state = this.getState();
    const categoryNamesMaxChr =
      Object.keys(state.categories).reduce((acc, categoryName) => {
        return Math.max(acc, categoryName.length);
      }, 10) + 4;

    return `${HORIZONTAL_LINE}
${'Overall Progress: '.padEnd(categoryNamesMaxChr + 4)}${state.prctDone}%
${HORIZONTAL_LINE}
${
  'Elapsed Time (hh:mm:ss.ms):'.padEnd(categoryNamesMaxChr + 4) +
  getElapsedTime(this.getStartedTime())
}
${'Error Count:'.padEnd(categoryNamesMaxChr + 4) + state.errorCount}
Details:
  ${Object.entries(state.categories).reduce((acc, [categoryName, categoryState]) => {
    let updatedOutput = acc;

    if (updatedOutput.length) {
      updatedOutput += `\n  `;
    }

    updatedOutput += `${`${`${categoryName}:`
      .concat(' '.repeat(categoryNamesMaxChr))
      .substring(0, categoryNamesMaxChr)}  ${categoryState.prctDone}%`.padEnd(
      categoryNamesMaxChr + 10
    )}(${categoryState.doneCount} / ${categoryState.totalCount}, ${
      categoryState.errorCount
    } errors)`;

    return updatedOutput;
  }, '')}`;
  }

  getStartedTime(): Date {
    return new Date(this.startedAt);
  }
}

const calculatePercentage = (totalCount: number, doneCount: number): number => {
  if (totalCount <= 0 || doneCount <= 0) {
    return 0;
  }

  return Math.min(100, Number(((doneCount / totalCount) * 100).toPrecision(3)));
};
