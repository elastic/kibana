/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type { InfraWaffleMapOptions } from '../../../../../common/inventory/types';
import { AssetDetails } from '../../../../../components/asset_details';
import { getAssetDetailsFlyoutTabs } from '../../../../../common/asset_details_config/asset_details_tabs';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../../hooks/use_waffle_time';

interface Props {
  entityName?: string;
  entityId: string;
  entityType: InventoryItemType;
  closeFlyout: () => void;
  options?: Pick<InfraWaffleMapOptions, 'groupBy' | 'metric'>;
}

export const AssetDetailsFlyout = ({
  entityName,
  entityId,
  entityType,
  closeFlyout,
  options,
}: Props) => {
  const { preferredSchema } = useWaffleOptionsContext();
  const { dateRange } = useWaffleTimeContext();

  return (
    <AssetDetails
      entityId={entityId}
      entityName={entityName}
      entityType={entityType}
      overrides={{
        metadata: {
          showActionsColumn: false,
        },
        alertRule: {
          options,
        },
      }}
      tabs={getAssetDetailsFlyoutTabs(entityType)}
      links={['nodeDetails']}
      renderMode={{
        mode: 'flyout',
        closeFlyout,
      }}
      dateRange={dateRange}
      preferredSchema={preferredSchema}
    />
  );
};
