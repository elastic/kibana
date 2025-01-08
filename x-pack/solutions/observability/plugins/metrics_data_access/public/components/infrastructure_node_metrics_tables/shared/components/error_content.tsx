/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

export const MetricsTableErrorContent = ({ error }: { error: Error }) => (
  <EuiEmptyPrompt
    body={
      <EuiCodeBlock className="eui-textLeft" isCopyable language="jsstacktrace">
        {error.stack ?? `${error}`}
      </EuiCodeBlock>
    }
    color="danger"
    data-test-subj="metricsTableErrorContent"
    iconType="warning"
    title={<h2>{error.message}</h2>}
    titleSize="s"
  />
);
