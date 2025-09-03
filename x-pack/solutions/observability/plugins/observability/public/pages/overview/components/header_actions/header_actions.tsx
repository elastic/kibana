/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { DatePicker } from '../date_picker/date_picker';
import { useDatePickerContext } from '../../../../hooks/use_date_picker_context';

export function HeaderActions() {
  const { relativeStart, relativeEnd, refreshInterval, refreshPaused } = useDatePickerContext();

  return (
    <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <DatePicker
          rangeFrom={relativeStart}
          rangeTo={relativeEnd}
          refreshInterval={refreshInterval}
          refreshPaused={refreshPaused}
          width="auto"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
