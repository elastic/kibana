/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { handleSelectOptions } from './select_indices';

describe('handleSelectOptions', () => {
  const setSelectedTempIndices = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should handle selecting indices', () => {
    const selectedIndices: string[] = [];
    const options = [
      { label: 'index1', checked: 'on' },
      { label: 'index2', checked: undefined },
      { label: 'index3', checked: undefined },
    ] as EuiSelectableOption[];

    const expectedUpdatedSelectedIndices = ['index1'];

    handleSelectOptions(selectedIndices, setSelectedTempIndices)(options);

    expect(setSelectedTempIndices).toHaveBeenCalledWith(expectedUpdatedSelectedIndices);
  });
  it('should handle unselecting indices', () => {
    const selectedIndices: string[] = ['index1', 'index2', 'index3'];
    const options = [
      { label: 'index1', checked: undefined },
      { label: 'index2', checked: undefined },
      { label: 'index3', checked: undefined },
    ] as EuiSelectableOption[];

    const expectedUpdatedSelectedIndices: string[] = [];

    handleSelectOptions(selectedIndices, setSelectedTempIndices)(options);

    expect(setSelectedTempIndices).toHaveBeenCalledWith(expectedUpdatedSelectedIndices);
  });
  it('should update selected indices correctly', () => {
    const selectedIndices = ['index1', 'index2'];
    const options = [
      { label: 'index1', checked: 'on' },
      { label: 'index2', checked: undefined },
      { label: 'index3', checked: 'on' },
    ] as EuiSelectableOption[];

    const expectedUpdatedSelectedIndices = ['index1', 'index3'];

    handleSelectOptions(selectedIndices, setSelectedTempIndices)(options);

    expect(setSelectedTempIndices).toHaveBeenCalledWith(expectedUpdatedSelectedIndices);
  });
  it('should keep existing indices when they are not included in the options', () => {
    const selectedIndices = ['index1', 'index2'];
    const options = [
      { label: 'index2', checked: undefined },
      { label: 'index3', checked: 'on' },
    ] as EuiSelectableOption[];

    const expectedUpdatedSelectedIndices = ['index1', 'index3'];
    handleSelectOptions(selectedIndices, setSelectedTempIndices)(options);

    expect(setSelectedTempIndices).toHaveBeenCalledWith(expectedUpdatedSelectedIndices);
  });
});
