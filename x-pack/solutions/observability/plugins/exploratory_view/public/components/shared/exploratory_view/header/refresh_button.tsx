/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { useSeriesStorage } from '../hooks/use_series_storage';

export function RefreshButton() {
  const { setLastRefresh } = useSeriesStorage();

  return (
    <EuiButton
      data-test-subj="o11yRefreshButtonButton"
      iconType="refresh"
      onClick={() => setLastRefresh(Date.now())}
    >
      {REFRESH_LABEL}
    </EuiButton>
  );
}

export const REFRESH_LABEL = i18n.translate('xpack.exploratoryView.refresh', {
  defaultMessage: 'Refresh',
});
