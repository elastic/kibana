/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentType } from 'react';
import { Store } from 'redux';
import { ReactWrapper } from 'enzyme';
import { MemoryRouter } from 'react-router-dom';

export type RegisterTestBed = (
  component: ComponentType,
  defaultProps?: any,
  options?: TestBedOptions,
  store?: Store | null
) => SetupFunc;

export type SetupFunc = (props?: any) => TestBed;

export interface EuiTableMetaData {
  /** Array of rows of the table. Each row exposes its reactWrapper and its columns */
  rows: Array<{
    reactWrapper: ReactWrapper;
    columns: Array<{
      reactWrapper: ReactWrapper;
      value: string;
    }>;
  }>;
  /** A 2 dimensional array of rows & columns containing
   * the text content of each cell of the table */
  tableCellsValues: string[][];
}

export interface TestBed {
  /** The comonent under test */
  component: ReactWrapper;
  exists: (testSubject: string, count: number) => boolean;
  find: (testSubject: string) => ReactWrapper;
  setProps: (updatedProps: any) => void;
  form: {
    setInputValue: (
      input: string | ReactWrapper,
      value: string,
      isAsync?: boolean
    ) => Promise<{}> | undefined;
    selectCheckBox: (checkboxTestSubject: string, isChecked?: boolean) => void;
    toggleEuiSwitch: (switchTestSubject: string) => void;
    setComboBoxValue: (comboBoxTestSubject: string, value: string) => void;
    getErrorsMessages: () => string[];
  };
  table: {
    getMetaData: (tableTestSubject: string) => EuiTableMetaData;
  };
}

export interface TestBedOptions {
  memoryRouter: {
    wrapComponent: boolean;
    initialEntries?: string[];
    initialIndex?: number;
    componentRoutePath?: string;
    onRouter?: (router: MemoryRouter) => void;
  };
}
