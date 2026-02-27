/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiText } from '@elastic/eui';

export const ActionCompletionReturnButton = React.memo(
  ({ onClick, buttonText }: { onClick: () => void; buttonText: string }) => {
    const onClickCallback = useCallback(() => onClick(), [onClick]);

    return (
      <>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="right"
              onClick={onClickCallback}
              data-test-subj="hostIsolateSuccessCompleteButton"
            >
              <EuiText size="s">
                <p>{buttonText}</p>
              </EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

ActionCompletionReturnButton.displayName = 'ActionCompletionReturnButton';
