/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import * as i18n from './translations';
import {
  CLOSING_REASON_ISSUE_RESOLVED,
  CLOSING_REASON_ACCEPTABLE_RISK,
  CLOSING_REASON_EXPECTED_ACTIVITY,
  CLOSING_REASON_LOW_SEVERITY,
  CLOSING_REASON_DUPLICATE,
  CLOSING_REASON_FALSE_POSITIVE,
  CLOSING_REASON_FURTHER_INVESTIGATION_REQUIRED,
  CLOSING_REASON_CLOSE_WITHOUT_REASON,
} from '../../../../../common/translations';
import { AlertClosingReasonValues } from '../../../../../common/constants';
import type { AlertClosingReason } from '../../../../../common/constants';

const closingReasons: EuiSelectableOption<{
  key?: AlertClosingReason;
}>[] = [
  { label: CLOSING_REASON_CLOSE_WITHOUT_REASON, key: undefined },
  { label: CLOSING_REASON_ISSUE_RESOLVED, key: AlertClosingReasonValues.issue_resolved },
  { label: CLOSING_REASON_ACCEPTABLE_RISK, key: AlertClosingReasonValues.acceptable_risk },
  { label: CLOSING_REASON_EXPECTED_ACTIVITY, key: AlertClosingReasonValues.expected_activity },
  { label: CLOSING_REASON_LOW_SEVERITY, key: AlertClosingReasonValues.low_severity },
  { label: CLOSING_REASON_DUPLICATE, key: AlertClosingReasonValues.duplicate },
  { label: CLOSING_REASON_FALSE_POSITIVE, key: AlertClosingReasonValues.false_positive },
  {
    label: CLOSING_REASON_FURTHER_INVESTIGATION_REQUIRED,
    key: AlertClosingReasonValues.investigation_required,
  },
];

interface BulkAlertClosingReasonComponentProps {
  onSubmit(reason?: AlertClosingReason): void;
}

const BulkAlertClosingReasonComponent: React.FC<BulkAlertClosingReasonComponentProps> = ({
  onSubmit,
}) => {
  const [options, setOptions] = useState(closingReasons);

  const selectedOption = useMemo(() => {
    return options.find((option) => option.checked);
  }, [options]);

  const onSubmitHandler = useCallback(() => {
    if (!selectedOption) return;

    onSubmit(selectedOption.key);
  }, [onSubmit, selectedOption]);

  return (
    <>
      <EuiSelectable
        options={options}
        onChange={(updatedOptions) => setOptions(updatedOptions)}
        singleSelection
      >
        {(list) => list}
      </EuiSelectable>
      <EuiButton fullWidth size="s" disabled={!selectedOption} onClick={onSubmitHandler}>
        {i18n.ALERT_CLOSING_REASON_BUTTON_MESSAGE}
      </EuiButton>
    </>
  );
};

export const BulkAlertClosingReason = memo(BulkAlertClosingReasonComponent);
