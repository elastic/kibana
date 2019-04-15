/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';
import { MemoryRouter } from 'react-router-dom';

export type SetupFunc<T> = (props?: any) => TestBed<T>;

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

export interface TestBed<T> {
  /** The comonent under test */
  component: ReactWrapper;
  exists: (testSubject: T, count?: number) => boolean;
  find: (testSubject: T) => ReactWrapper;
  setProps: (updatedProps: any) => void;
  form: {
    setInputValue: (
      input: T | ReactWrapper,
      value: string,
      isAsync?: boolean
    ) => Promise<{}> | undefined;
    selectCheckBox: (checkboxTestSubject: T, isChecked?: boolean) => void;
    toggleEuiSwitch: (switchTestSubject: T) => void;
    setComboBoxValue: (comboBoxTestSubject: T, value: string) => void;
    getErrorsMessages: () => string[];
  };
  table: {
    getMetaData: (tableTestSubject: T) => EuiTableMetaData;
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
