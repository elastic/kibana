/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactElement } from 'react';
import { EuiDescriptionList, EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useErrorFailedTests } from '../hooks/use_error_failed_tests';
import { useDateFormat } from '../../../../../hooks/use_date_format';

export const ErrorStartedAt: React.FC = () => {
  const { failedTests } = useErrorFailedTests();

  const state = failedTests?.[0]?.state;

  const formatter = useDateFormat();
  let startedAt: string | ReactElement = formatter(state?.started_at);

  if (!startedAt) {
    startedAt = <EuiSkeletonText lines={1} />;
  }

  return <EuiDescriptionList listItems={[{ title: ERROR_DURATION, description: startedAt }]} />;
};

const ERROR_DURATION = i18n.translate('xpack.synthetics.errorDetails.startedAt', {
  defaultMessage: 'Started at',
});
