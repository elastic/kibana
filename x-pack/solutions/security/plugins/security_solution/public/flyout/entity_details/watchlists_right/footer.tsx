/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutFooter, EuiPanel, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
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
  return (
    <EuiFlyoutFooter>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
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
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
