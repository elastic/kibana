/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { AssetDetails } from '../../../../../components/asset_details';
import { hostDetailsTabs } from '../../../../../common/asset_details_config/asset_details_tabs';

export interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
  preferredSchema?: DataSchemaFormat | null;
}

export const FlyoutWrapper = ({ node: { name }, closeFlyout, preferredSchema }: Props) => {
  const { parsedDateRange } = useUnifiedSearchContext();

  return (
    <AssetDetails
      entityId={name}
      entityName={name}
      entityType="host"
      dateRange={parsedDateRange}
      overrides={{
        metadata: {
          showActionsColumn: true,
        },
      }}
      tabs={hostDetailsTabs}
      links={['nodeDetails']}
      renderMode={{
        mode: 'flyout',
        closeFlyout,
      }}
      preferredSchema={preferredSchema}
    />
  );
};
