/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButton, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { DEFAULT_ALERT_CLOSE_REASONS_KEY } from '../../../../../common/constants';
import * as i18n from './translations';
import { AlertDefaultClosingReasonValues } from '../../../../../common/types';
import type { AlertClosingReason } from '../../../../../common/types';

export const defaultClosingReasons: EuiSelectableOption<{
  key?: AlertClosingReason;
}>[] = [
  { label: i18n.CLOSING_REASON_CLOSE_WITHOUT_REASON, key: undefined },

  { label: i18n.CLOSING_REASON_DUPLICATE, key: AlertDefaultClosingReasonValues.duplicate },
  {
    label: i18n.CLOSING_REASON_FALSE_POSITIVE,
    key: AlertDefaultClosingReasonValues.false_positive,
  },
  { label: i18n.CLOSING_REASON_TRUE_POSITIVE, key: AlertDefaultClosingReasonValues.true_positive },
  {
    label: i18n.CLOSING_REASON_BENIGN_POSITIVE,
    key: AlertDefaultClosingReasonValues.benign_positive,
  },
  { label: i18n.CLOSING_REASON_OTHER, key: AlertDefaultClosingReasonValues.other },
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
  const [options, setOptions] = useState(defaultClosingReasons);
  const {
    services: { uiSettings },
  } = useKibana<{ uiSettings: IUiSettingsClient }>();

  const selectedOption = useMemo(() => options.find((option) => option.checked), [options]);

  const onSubmitHandler = useCallback(() => {
    if (!selectedOption) return;

    onSubmit(selectedOption.key);
  }, [onSubmit, selectedOption]);

  useEffect(() => {
    const customClosingReasons = uiSettings.get<string[]>(DEFAULT_ALERT_CLOSE_REASONS_KEY);
    setOptions([
      ...defaultClosingReasons,
      ...customClosingReasons.map((reason) => {
        return {
          label: reason,
          key: reason,
        };
      }),
    ]);
  }, [uiSettings]);

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
