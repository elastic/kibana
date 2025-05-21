/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function EmptyDataPrompt() {
  return (
    <>
      <EuiSpacer />
      <EuiEmptyPrompt
        color="subdued"
        iconType="search"
        titleSize="xs"
        title={
          <h2>
            {i18n.translate('xpack.infra.profiling.emptyDataPromptTitle', {
              defaultMessage: 'No data found',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.infra.profiling.emptyDataPromptBody', {
              defaultMessage:
                'Make sure this host is sending profiling data or try selecting a different date range.',
            })}
          </p>
        }
      />
    </>
  );
}
