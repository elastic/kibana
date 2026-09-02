/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, EuiButton, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

export const WatchlistsFlyoutFooter = ({
  onSave,
  isLoading,
  isDisabled,
}: {
  onSave: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup
        justifyContent="flexEnd"
        alignItems="center"
        css={css`
          padding: ${euiTheme.size.m};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="watchlist-flyout-save"
            fill
            onClick={onSave}
            isLoading={isLoading}
            isDisabled={isDisabled}
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.saveButton"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
