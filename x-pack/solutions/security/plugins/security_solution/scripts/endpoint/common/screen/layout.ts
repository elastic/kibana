/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { DataFormatter } from './data_formatter';

class LayoutFormatter extends DataFormatter {
  constructor(private readonly layout: string) {
    super();
  }

  protected getOutput(): string {
    return this.layout;
  }
}

/**
 * A Tagged Template literal processor to assist with creating layouts for CLI screens
 *
 * @example
 *
 * layout`
 *   My Tool             ${new Date().toIsoString()}
 * ------------------------------------------------------
 * `;
 * // Output:
 * //
 * //   MyTool             2023-04-07T15:03:05.300Z
 * // ------------------------------------------------------
 */
export const layout = (strings: TemplateStringsArray, ...values: any): LayoutFormatter => {
  const valuesLength = values.length;

  const output = strings.reduce((out, string, index) => {
    const value = index < valuesLength ? values[index] : '';

    return out + string + (value instanceof DataFormatter ? value.output : `${value}`);
  }, '');

  return new LayoutFormatter(output);
};
