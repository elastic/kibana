/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { green } from 'chalk';
import { SCREEN_ROW_MAX_WIDTH } from './constants';
import { DataFormatter } from './data_formatter';

const MAX_WIDTH = SCREEN_ROW_MAX_WIDTH - 14;

export class ProgressFormatter extends DataFormatter {
  private percentDone: number = 0;

  public setProgress(percentDone: number) {
    this.percentDone = percentDone;
  }

  protected getOutput(): string {
    const prctDone = Math.min(100, this.percentDone);
    const repeatValue = Math.ceil(MAX_WIDTH * (prctDone / 100));
    const progressPrct = `${prctDone}%`;

    return `[ ${'='.repeat(repeatValue).padEnd(MAX_WIDTH)} ] ${
      prctDone === 100 ? green(progressPrct) : progressPrct
    }`;
  }
}
