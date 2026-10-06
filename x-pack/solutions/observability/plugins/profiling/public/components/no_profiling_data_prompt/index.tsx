/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const NO_DATA_TITLE = i18n.translate('xpack.profiling.noProfilingDataPrompt.title', {
  defaultMessage: 'No profiling data found',
});

export const NO_DATA_BODY = i18n.translate('xpack.profiling.noProfilingDataPrompt.body', {
  defaultMessage: 'Try updating your search filters or selecting a different time range or schema',
});

export function NoProfilingDataPrompt({
  hasData,
  children,
}: {
  hasData: boolean;
  children: React.ReactElement;
}) {
  if (hasData) {
    return children;
  }

  return (
    <EuiEmptyPrompt
      data-test-subj="profilingNoDataPrompt"
      color="subdued"
      iconType="magnify"
      titleSize="xs"
      title={<h2>{NO_DATA_TITLE}</h2>}
      body={<p>{NO_DATA_BODY}</p>}
    />
  );
}
