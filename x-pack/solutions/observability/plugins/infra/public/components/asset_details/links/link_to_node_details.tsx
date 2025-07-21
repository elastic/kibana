/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';
import { parse } from '@kbn/datemath';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { useAssetDetailsRedirect } from '@kbn/metrics-data-access-plugin/public';

import { useAssetDetailsUrlState } from '../hooks/use_asset_details_url_state';

export interface LinkToNodeDetailsProps {
  entityId: string;
  entityName?: string;
  entityType: InventoryItemType;
}

export const LinkToNodeDetails = ({ entityId, entityName, entityType }: LinkToNodeDetailsProps) => {
  const [state] = useAssetDetailsUrlState();
  const { getAssetDetailUrl } = useAssetDetailsRedirect();

  // don't propagate the autoRefresh to the details page
  const { dateRange, autoRefresh: _, ...assetDetails } = state ?? {};

  const assetDetailMenuItemLinkProps = getAssetDetailUrl({
    entityType,
    entityId,
    search: {
      ...assetDetails,
      name: entityName,
      from: parse(dateRange?.from ?? '')?.valueOf(),
      to: parse(dateRange?.to ?? '')?.valueOf(),
    },
  });

  return (
    <EuiButtonEmpty
      aria-label={i18n.translate('xpack.infra.linkToNodeDetails.openaspageButton.ariaLabel', {
        defaultMessage: 'Open as page',
      })}
      data-test-subj="infraAssetDetailsOpenAsPageButton"
      size="xs"
      flush="both"
      {...assetDetailMenuItemLinkProps}
    >
      <FormattedMessage
        id="xpack.infra.infra.nodeDetails.openAsPage"
        defaultMessage="Open as page"
      />
    </EuiButtonEmpty>
  );
};
