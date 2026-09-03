/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { DEFAULT_CLOSING_REASON_OPTIONS } from '@kbn/response-ops-detections-close-reason';

import { DEFAULT_DETECTIONS_CLOSE_REASONS_KEY } from '../../../../../../common/constants';
import type { AlertClosingReason } from '../../../../../../common/types';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import * as i18n from './translations';

// `EuiSuperSelect` values must be strings, so the "Close without reason" option
// (which has no reason key) is represented by an empty string.
const NO_REASON_VALUE = '';

interface ClosingReasonSelectProps {
  value?: AlertClosingReason;
  disabled?: boolean;
  onChange: (reason?: AlertClosingReason) => void;
}

const ClosingReasonSelectComponent: React.FC<ClosingReasonSelectProps> = ({
  value,
  disabled = false,
  onChange,
}): JSX.Element => {
  const [customClosingReasons] = useUiSetting$<string[]>(DEFAULT_DETECTIONS_CLOSE_REASONS_KEY);

  const options = useMemo<Array<EuiSuperSelectOption<string>>>(
    () => [
      ...DEFAULT_CLOSING_REASON_OPTIONS.map(({ key, label }) => ({
        value: key ?? NO_REASON_VALUE,
        inputDisplay: label,
      })),
      ...(customClosingReasons ?? []).map((reason) => ({ value: reason, inputDisplay: reason })),
    ],
    [customClosingReasons]
  );

  const handleChange = useCallback(
    (selected: string): void => {
      onChange(selected === NO_REASON_VALUE ? undefined : selected);
    },
    [onChange]
  );

  return (
    <EuiFormRow fullWidth label={i18n.CLOSE_ALERTS_REASON_LABEL}>
      <EuiSuperSelect
        fullWidth
        aria-label={i18n.CLOSE_ALERTS_REASON_LABEL}
        data-test-subj="exceptionFlyoutCloseReasonSelect"
        options={options}
        valueOfSelected={value ?? NO_REASON_VALUE}
        onChange={handleChange}
        disabled={disabled}
      />
    </EuiFormRow>
  );
};

export const ClosingReasonSelect = memo(ClosingReasonSelectComponent);

ClosingReasonSelect.displayName = 'ClosingReasonSelect';
