/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiSpacer, EuiCodeBlock, useEuiPaddingSize, EuiFlexItem } from '@elastic/eui';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine';

export const LoggedRequestsQueryComponent: FC<RulePreviewLoggedRequest> = ({
  description,
  duration,
  request,
}) => {
  const paddingLarge = useEuiPaddingSize('l');

  return (
    <EuiFlexItem css={{ 'padding-left': paddingLarge }}>
      <EuiSpacer size="l" />
      <span data-test-subj="preview-logged-request-description">
        {description ?? null} {duration ? `[${duration}ms]` : null}
      </span>
      <EuiSpacer size="s" />
      {request ? (
        <EuiCodeBlock
          language="json"
          isCopyable
          overflowHeight={300}
          isVirtualized
          data-test-subj="preview-logged-request-code-block"
        >
          {request}
        </EuiCodeBlock>
      ) : null}
    </EuiFlexItem>
  );
};

export const LoggedRequestsQuery = React.memo(LoggedRequestsQueryComponent);
LoggedRequestsQuery.displayName = 'LoggedRequestsQuery';
