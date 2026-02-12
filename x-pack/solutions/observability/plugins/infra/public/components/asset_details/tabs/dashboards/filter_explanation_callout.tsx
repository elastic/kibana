/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiCode } from '@elastic/eui';

import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { css } from '@emotion/react';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';

interface Props {
  dashboardFilterAssetIdEnabled: boolean;
}
export const FilterExplanationCallout = ({ dashboardFilterAssetIdEnabled }: Props) => {
  const { entity } = useAssetDetailsRenderPropsContext();

  return (
    <EuiCallOut
      size="s"
      title={
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={
                dashboardFilterAssetIdEnabled ? (
                  <>
                    {i18n.translate(
                      'xpack.infra.customDashboards.filteredByCurrentAssetExplanation.tooltip',
                      {
                        defaultMessage: 'Filtered by',
                      }
                    )}
                    <EuiCode
                      transparentBackground
                      css={css`
                        color: inherit;
                      `}
                    >{`${findInventoryFields(entity.type).id}: ${entity.id}`}</EuiCode>
                  </>
                ) : (
                  i18n.translate('xpack.infra.customDashboards.notFilteredExplanation.tooltip', {
                    defaultMessage:
                      'You can change this dashboard to filter by the {entityType} by editing the link for it',
                    values: { entityType: entity.type },
                  })
                )
              }
              color="primary"
              size="m"
              type="info"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {dashboardFilterAssetIdEnabled
              ? i18n.translate(
                  'xpack.infra.customDashboards.filteredByCurrentAssetExplanation.message',
                  {
                    defaultMessage: 'This dashboard is filtered by the current {entityType}',
                    values: { entityType: entity.type },
                  }
                )
              : i18n.translate('xpack.infra.customDashboards.notFilteredExplanation.message', {
                  defaultMessage:
                    'This dashboard is not filtered by the {entityType} you are viewing',
                  values: { entityType: entity.type },
                })}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};
