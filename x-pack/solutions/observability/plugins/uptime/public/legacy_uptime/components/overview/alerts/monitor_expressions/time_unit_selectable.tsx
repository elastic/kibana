/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSelectable } from '@elastic/eui';

export interface TimeRangeOption {
  'aria-label': string;
  'data-test-subj': string;
  key: string;
  label: string;
  checked?: 'on' | 'off';
}

interface Props {
  'aria-label': string;
  'data-test-subj': string;
  headlineText: string;
  onChange: (newOptions: Array<Pick<TimeRangeOption, 'checked'>>) => void;
  timeRangeOptions: TimeRangeOption[];
}

export const TimeUnitSelectable: React.FC<Props> = ({
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  headlineText: headlineText,
  onChange,
  timeRangeOptions,
}) => {
  return (
    <>
      <EuiTitle size="xxs">
        <h5>{headlineText}</h5>
      </EuiTitle>
      <EuiSelectable
        aria-label={ariaLabel}
        data-test-subj={dataTestSubj}
        options={timeRangeOptions}
        onChange={onChange}
        singleSelection={true}
        listProps={{
          showIcons: true,
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </>
  );
};
