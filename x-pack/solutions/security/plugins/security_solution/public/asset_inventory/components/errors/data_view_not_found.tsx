/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useInstallDataView } from './hooks/use_install_data_view';
import { AssetInventoryTitle } from '../asset_inventory_title';
import { CenteredWrapper } from '../onboarding/centered_wrapper';

export const DataViewNotFound = ({
  refetchDataView,
}: {
  refetchDataView: UseQueryResult['refetch'];
}) => {
  const { isInstalling, installDataView, error, reset } = useInstallDataView({
    callback: refetchDataView,
  });
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <AssetInventoryTitle />
        <CenteredWrapper>
          <EuiEmptyPrompt
            iconType="error"
            color="danger"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.dataViewNotFound.title"
                  defaultMessage="Unable to show your Inventory"
                />
              </h2>
            }
            body={
              <>
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.assetInventory.dataViewNotFound.description"
                    defaultMessage="The data view needed to display this page can't be found. It may have been deleted or renamed. You can try create it again to fix this."
                  />
                </p>
              </>
            }
            actions={[
              <EuiButton color="primary" fill onClick={installDataView} isLoading={isInstalling}>
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.dataViewNotFound.resetFiltersButton"
                  defaultMessage="Create Asset Inventory DataView"
                />
              </EuiButton>,
            ]}
            footer={
              error ? (
                <EuiCallOut
                  onDismiss={reset}
                  title={
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.dataViewNotFound.error.title"
                      defaultMessage="There was an error creating the data view"
                    />
                  }
                  color="danger"
                  iconType="error"
                >
                  <p>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.dataViewNotFound.error.description"
                      defaultMessage="Check if you have the necessary permissions to create the data view."
                    />
                    <br />
                    <strong>
                      <FormattedMessage
                        id="xpack.securitySolution.assetInventory.dataViewNotFound.error.errorTitle"
                        defaultMessage="Error:"
                      />{' '}
                    </strong>
                    {error}
                  </p>
                </EuiCallOut>
              ) : null
            }
          />
        </CenteredWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
