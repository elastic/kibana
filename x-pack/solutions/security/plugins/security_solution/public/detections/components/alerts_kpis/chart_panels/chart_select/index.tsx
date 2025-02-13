/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { AlertViewSelection } from './helpers';
import { getOptionProperties } from './helpers';
import * as i18n from './translations';

interface Props {
  alertViewSelection: AlertViewSelection;
  setAlertViewSelection: (alertViewSelection: AlertViewSelection) => void;
}

const AlertViewOptions: AlertViewSelection[] = ['charts', 'trend', 'table', 'treemap'];

export const ChartSelect: React.FC<Props> = ({
  alertViewSelection,
  setAlertViewSelection,
}: Props) => {
  const options = useMemo(() => {
    return AlertViewOptions.map((option: AlertViewSelection) => getOptionProperties(option));
  }, []);

  return (
    <EuiButtonGroup
      name="chart-select"
      legend={i18n.LEGEND_TITLE}
      options={options}
      idSelected={alertViewSelection}
      onChange={(id) => setAlertViewSelection(id as AlertViewSelection)}
      buttonSize="compressed"
      color="primary"
      data-test-subj="chart-select-tabs"
    />
  );
};

ChartSelect.displayName = 'ChartSelect';
