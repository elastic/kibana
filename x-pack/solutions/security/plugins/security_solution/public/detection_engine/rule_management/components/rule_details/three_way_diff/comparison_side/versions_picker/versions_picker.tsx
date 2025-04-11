/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/css';
import { EuiSelect } from '@elastic/eui';
import { getOptionDetails } from '../utils';
import * as i18n from './translations';

export enum VersionsPickerOptionEnum {
  MyChanges = 'MY_CHANGES',
  MyOriginalChanges = 'MY_ORIGINAL_CHANGES',
  UpdateFromElastic = 'UPDATE_FROM_ELASTIC',
  Merged = 'MERGED',
}

interface VersionsPickerProps {
  options: VersionsPickerOptionEnum[];
  selectedOption: VersionsPickerOptionEnum;
  onChange: (selectedOption: VersionsPickerOptionEnum) => void;
}

export function VersionsPicker({ options, selectedOption, onChange }: VersionsPickerProps) {
  const euiSelectOptions = options.map((option) => {
    const { title: displayName, description: explanation } = getOptionDetails(option);

    return {
      value: option,
      text: displayName,
      title: explanation,
    };
  });

  const handleChange = useCallback(
    (changeEvent: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(changeEvent.target.value as VersionsPickerOptionEnum);
    },
    [onChange]
  );

  return (
    <EuiSelect
      className={VERSIONS_PICKER_STYLES}
      options={euiSelectOptions}
      value={selectedOption}
      onChange={handleChange}
      aria-label={i18n.VERSION_PICKER_ARIA_LABEL}
    />
  );
}

const VERSIONS_PICKER_STYLES = css`
  // Set min-width a bit wider than default
  // to make English text in narrow screens readable
  min-width: 300px;
`;
