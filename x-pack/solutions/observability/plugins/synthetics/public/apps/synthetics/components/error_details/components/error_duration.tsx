/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { useErrorFailedTests } from '../hooks/use_error_failed_tests';
import { useFindMyKillerState } from '../hooks/use_find_my_killer_state';
import { getErrorDuration } from '../../../utils/formatting';

export const ErrorDuration: React.FC = () => {
  const { failedTests } = useErrorFailedTests();

  const state = failedTests?.[0]?.state;

  const { killerState } = useFindMyKillerState();

  const endsAt = killerState?.['@timestamp'] ? moment(killerState?.['@timestamp']) : moment();
  const startedAt = moment(state?.started_at);

  const duration = state ? getErrorDuration(startedAt, endsAt) : 0;

  return <EuiDescriptionList listItems={[{ title: ERROR_DURATION, description: duration }]} />;
};

const ERROR_DURATION = i18n.translate('xpack.synthetics.errorDetails.errorDuration', {
  defaultMessage: 'Error duration',
});
