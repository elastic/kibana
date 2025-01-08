/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFormRow, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Validation } from '../../../../../../../common/types';
import {
  BandwidthLimitKey,
  ConfigKey,
  DEFAULT_BANDWIDTH_LIMIT,
  ThrottlingConfig,
  ThrottlingConfigValue,
} from '../../../../../../../common/runtime_types';
import { ThrottlingExceededMessage } from './throttling_exceeded_callout';
import { OptionalLabel } from '../optional_label';

export const ThrottlingUploadField = ({
  readOnly,
  onFieldBlur,
  throttling,
  validate,
  handleInputChange,
  throttlingValue,
}: {
  readOnly?: boolean;
  handleInputChange: (value: string) => void;
  onFieldBlur?: (field: keyof ThrottlingConfigValue) => void;
  validate?: Validation;
  throttling: ThrottlingConfig;
  throttlingValue: ThrottlingConfigValue;
}) => {
  const maxUpload = Number(DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.UPLOAD]);

  const exceedsUploadLimits = Number(throttlingValue.upload) > maxUpload;

  return (
    <EuiFormRow
      fullWidth
      label={UPLOAD_LABEL}
      labelAppend={<OptionalLabel />}
      isInvalid={
        (validate ? !!validate?.[ConfigKey.THROTTLING_CONFIG]?.(throttling) : false) ||
        exceedsUploadLimits
      }
      error={
        exceedsUploadLimits ? (
          <ThrottlingExceededMessage throttlingField="upload" limit={maxUpload} />
        ) : (
          UPLOAD_SPEED_ERROR
        )
      }
    >
      <EuiFieldNumber
        fullWidth
        min={0}
        step={0.001}
        value={throttlingValue.upload}
        onChange={(event) => handleInputChange(event.target.value)}
        onBlur={() => onFieldBlur?.('upload')}
        data-test-subj="syntheticsBrowserUploadSpeed"
        append={
          <EuiText size="xs">
            <strong>Mbps</strong>
          </EuiText>
        }
        readOnly={readOnly}
      />
    </EuiFormRow>
  );
};

export const UPLOAD_LABEL = i18n.translate(
  'xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.upload.label',
  { defaultMessage: 'Upload Speed' }
);

export const UPLOAD_SPEED_ERROR = i18n.translate(
  'xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.upload.error',
  {
    defaultMessage: 'Upload speed must be greater than zero.',
  }
);
