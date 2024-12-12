/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ThrottlingUploadField } from './throttling_upload_field';
import { ThrottlingExceededCallout } from './throttling_exceeded_callout';
import {
  BandwidthLimitKey,
  DEFAULT_BANDWIDTH_LIMIT,
  ThrottlingConfig,
  ThrottlingConfigValue,
} from '../../../../../../../common/runtime_types';
import { Validation } from '../../types';
import { ThrottlingDisabledCallout } from './throttling_disabled_callout';
import { ThrottlingDownloadField } from './throttling_download_field';
import { ThrottlingLatencyField } from './throttling_latency_field';
import { CUSTOM_LABEL, PROFILE_VALUES_ENUM } from '../../constants';

interface Props {
  validate?: Validation;
  minColumnWidth?: string;
  onFieldBlur?: (field: keyof ThrottlingConfigValue) => void;
  readOnly?: boolean;
  throttling: ThrottlingConfig;
  setValue: (value: ThrottlingConfig) => void;
}

export const ThrottlingFields = memo<Props>(
  ({ validate, onFieldBlur, setValue, readOnly = false, throttling }) => {
    const maxDownload = DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.DOWNLOAD];
    const maxUpload = DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.UPLOAD];

    const handleInputChange = useCallback(
      ({ value, configKey }: { value: string; configKey: string }) => {
        setValue({
          ...throttling,
          value: { ...throttling.value!, [configKey]: value },
          label: CUSTOM_LABEL,
          id: PROFILE_VALUES_ENUM.CUSTOM,
        });
      },
      [setValue, throttling]
    );

    const exceedsDownloadLimits = Number(throttling.value?.download) > maxDownload;
    const exceedsUploadLimits = Number(throttling.value?.upload) > maxUpload;
    const isThrottlingEnabled = throttling.id !== PROFILE_VALUES_ENUM.NO_THROTTLING;

    const hasExceededLimits = isThrottlingEnabled && (exceedsDownloadLimits || exceedsUploadLimits);

    if (!isThrottlingEnabled || !throttling.value) {
      return <ThrottlingDisabledCallout />;
    }

    return (
      <div>
        {hasExceededLimits && <ThrottlingExceededCallout />}
        <EuiSpacer size="m" />
        <ThrottlingDownloadField
          validate={validate}
          onFieldBlur={onFieldBlur}
          throttling={throttling}
          throttlingValue={throttling.value}
          handleInputChange={(val) => {
            handleInputChange({ value: val, configKey: 'download' });
          }}
          readOnly={readOnly}
        />
        <ThrottlingUploadField
          throttlingValue={throttling.value}
          validate={validate}
          onFieldBlur={onFieldBlur}
          throttling={throttling}
          handleInputChange={(val) => {
            handleInputChange({ value: val, configKey: 'upload' });
          }}
          readOnly={readOnly}
        />
        <ThrottlingLatencyField
          throttlingValue={throttling.value}
          validate={validate}
          onFieldBlur={onFieldBlur}
          throttling={throttling}
          handleInputChange={(val) => {
            handleInputChange({ value: val, configKey: 'latency' });
          }}
          readOnly={readOnly}
        />
      </div>
    );
  }
);
