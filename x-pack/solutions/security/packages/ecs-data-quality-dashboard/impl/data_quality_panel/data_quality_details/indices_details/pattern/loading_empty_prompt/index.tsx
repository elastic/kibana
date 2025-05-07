/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import React, { useMemo } from 'react';

interface Props {
  loading: string;
}

const LoadingEmptyPromptComponent: React.FC<Props> = ({ loading }) => {
  const icon = useMemo(() => <EuiLoadingSpinner size="xxl" />, []);

  return (
    <EuiEmptyPrompt data-test-subj="loadingEmptyPrompt" icon={icon} title={<h2>{loading}</h2>} />
  );
};

LoadingEmptyPromptComponent.displayName = 'LoadingEmptyPromptComponent';

export const LoadingEmptyPrompt = React.memo(LoadingEmptyPromptComponent);
