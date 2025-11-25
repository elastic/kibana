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
import { AlertClosingReasonValues } from '../../../../../common/types';
import type { AlertClosingReason } from '../../../../../common/types';

export const closingReasons: EuiSelectableOption<{
  key?: AlertClosingReason;
}>[] = [
  { label: i18n.CLOSING_REASON_CLOSE_WITHOUT_REASON, key: undefined },

  { label: i18n.CLOSING_REASON_DUPLICATE, key: AlertClosingReasonValues.duplicate },
  { label: i18n.CLOSING_REASON_FALSE_POSITIVE, key: AlertClosingReasonValues.false_positive },
  { label: i18n.CLOSING_REASON_TRUE_POSITIVE, key: AlertClosingReasonValues.true_positive },
  { label: i18n.CLOSING_REASON_BENIGN_POSITIVE, key: AlertClosingReasonValues.benign_positive },
  { label: i18n.CLOSING_REASON_OTHER, key: AlertClosingReasonValues.other },
];

interface BulkAlertClosingReasonComponentProps {
  /**
   * Callback call once the user confirm their selection.
   * The reason passed is of type AlertClosingReasonValues or
   * `undefined` in case the user selected the option "close without reason"
   * @param reason
   */
  onSubmit(reason?: AlertClosingReason): void;
}

/**
 * Renders the list of available closing action for
 * the alerts and the confirm button
 */
const BulkAlertClosingReasonComponent: React.FC<BulkAlertClosingReasonComponentProps> = ({
  onSubmit,
}) => {
  const [options, setOptions] = useState(closingReasons);

  const selectedOption = useMemo(() => options.find((option) => option.checked), [options]);

  const onSubmitHandler = useCallback(() => {
    if (!selectedOption) return;

    onSubmit(selectedOption.key);
  }, [onSubmit, selectedOption]);

  return (
    <>
      <EuiSelectable
        options={options}
        onChange={(updatedOptions) => setOptions(updatedOptions)}
        singleSelection="always"
        height={options.length * 32}
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
