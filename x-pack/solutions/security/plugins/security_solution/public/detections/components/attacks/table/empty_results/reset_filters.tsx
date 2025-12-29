/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiEmptyPrompt, EuiIcon } from '@elastic/eui';

import * as i18n from './translations';

export const RESET_FILTERS_DATA_TEST_ID = 'emptyResultsResetFilters';

/**
 * Renders the empty state when filters are applied and no attacks match the criteria.
 */
export const ResetFilters: React.FC = React.memo(() => {
  return (
    <EuiEmptyPrompt
      data-test-subj={RESET_FILTERS_DATA_TEST_ID}
      icon={<EuiIcon type={'filterIgnore'} />}
      title={<h2>{i18n.RESET_FILTERS_TITLE}</h2>}
      body={<p>{i18n.RESET_FILTERS_BODY}</p>}
      actions={
        <EuiButtonEmpty color="primary" size="m" iconType={'refresh'}>
          {i18n.RESET_FILTERS_ACTION}
        </EuiButtonEmpty>
      }
    />
  );
});
ResetFilters.displayName = 'ResetFilters';
