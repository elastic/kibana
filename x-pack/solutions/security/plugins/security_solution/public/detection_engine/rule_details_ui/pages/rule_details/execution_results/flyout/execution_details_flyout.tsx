/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, useGeneratedHtmlId } from '@elastic/eui';
import type { UnifiedExecutionResult } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { FlyoutHeader } from './header';
import { FlyoutBody } from './body';

const EXECUTION_DETAILS_FLYOUT_WIDTH = 600;

interface ExecutionDetailsFlyoutProps {
  item: UnifiedExecutionResult;
  onClose: () => void;
}

export const ExecutionDetailsFlyout: React.FC<ExecutionDetailsFlyoutProps> = ({
  item,
  onClose,
}) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'flyoutTitle' });

  return (
    <EuiFlyout
      onClose={onClose}
      size={EXECUTION_DETAILS_FLYOUT_WIDTH}
      ownFocus
      aria-labelledby={flyoutTitleId}
      data-test-subj="executionDetailsFlyout"
    >
      <FlyoutHeader item={item} titleId={flyoutTitleId} />
      <FlyoutBody item={item} />
    </EuiFlyout>
  );
};
