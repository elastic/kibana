/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  ASSET_DETAILS_LOCATOR_ID,
  AssetDetailsLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { StringOrNull } from '../../../../..';

interface Props {
  name: StringOrNull;
  id: string;
  timerange: { from: number; to: number };
}

export function HostLink({ name, id, timerange }: Props) {
  const { services } = useKibana<{ share?: SharePluginStart }>();

  const assetDetailsLocator =
    services.share?.url.locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);

  const href = assetDetailsLocator?.getRedirectUrl({
    assetType: 'host',
    assetId: id,
    assetDetails: {
      dateRange: {
        from: new Date(timerange.from).toISOString(),
        to: new Date(timerange.to).toISOString(),
      },
    },
  });

  return (
    <>
      <a href={href}>{name}</a>
    </>
  );
}
