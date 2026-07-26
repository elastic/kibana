/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';

import { ilmPhasesFromSelectedOptions } from './ilm_phases_from_selected_options';

describe('ilmPhasesFromSelectedOptions', () => {
  it('returns English phase values when labels are localized (ja-JP / i18n regression)', () => {
    const selected: EuiComboBoxOptionOption[] = [
      { label: 'ホット', value: 'hot' },
      { label: 'ウォーム', value: 'warm' },
      { label: '管理対象外', value: 'unmanaged' },
    ];

    expect(ilmPhasesFromSelectedOptions(selected)).toEqual(['hot', 'warm', 'unmanaged']);
  });

  it('returns values when labels match English defaults', () => {
    const selected: EuiComboBoxOptionOption[] = [
      { label: 'hot', value: 'hot' },
      { label: 'warm', value: 'warm' },
    ];

    expect(ilmPhasesFromSelectedOptions(selected)).toEqual(['hot', 'warm']);
  });

  it('drops options without a string value', () => {
    const selected: EuiComboBoxOptionOption[] = [
      { label: 'hot', value: 'hot' },
      { label: 'broken' },
    ];

    expect(ilmPhasesFromSelectedOptions(selected)).toEqual(['hot']);
  });
});
