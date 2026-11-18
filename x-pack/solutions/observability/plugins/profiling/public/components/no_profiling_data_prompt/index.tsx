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

export const NO_BASELINE_DATA_TITLE = i18n.translate(
  'xpack.profiling.noProfilingDataPrompt.baselineTitle',
  { defaultMessage: 'No baseline data found' }
);

export const NO_BASELINE_DATA_BODY = i18n.translate(
  'xpack.profiling.noProfilingDataPrompt.baselineBody',
  {
    defaultMessage:
      'Try updating your baseline search filters or selecting a different time range or schema',
  }
);

type NoProfilingDataPromptVariant = 'default' | 'baseline';

const COPY_BY_VARIANT: Record<NoProfilingDataPromptVariant, { title: string; body: string }> = {
  default: { title: NO_DATA_TITLE, body: NO_DATA_BODY },
  baseline: { title: NO_BASELINE_DATA_TITLE, body: NO_BASELINE_DATA_BODY },
};

export function NoProfilingDataPrompt({
  hasData,
  variant = 'default',
  children,
}: {
  hasData: boolean;
  variant?: NoProfilingDataPromptVariant;
  children: React.ReactElement;
}) {
  if (hasData) {
    return children;
  }

  const { title, body } = COPY_BY_VARIANT[variant];

  return (
    <EuiEmptyPrompt
      data-test-subj="profilingNoDataPrompt"
      color="subdued"
      iconType="magnify"
      titleSize="xs"
      title={<h2>{title}</h2>}
      body={<p>{body}</p>}
    />
  );
}
