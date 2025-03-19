/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Connector } from '@kbn/search-connectors';

import { ElasticsearchIndexWithIngestion } from '../../../../../../common/types/indices';
import { isConnectorIndex, getIngestionMethod } from '../../../utils/indices';

import { SearchPlaygroundPopover } from '../../search_index/components/header_actions/search_playground_popover';

import { SyncsContextMenu } from './syncs_context_menu';

// Used to populate rightSideItems of an EuiPageTemplate, which is rendered right-to-left
export const getHeaderActions = (
  indexData: ElasticsearchIndexWithIngestion | undefined,
  connector?: Connector
) => {
  const ingestionMethod = getIngestionMethod(indexData);
  return [
    ...(isConnectorIndex(indexData) || connector ? [<SyncsContextMenu />] : []),
    ...(indexData
      ? [<SearchPlaygroundPopover indexName={indexData?.name} ingestionMethod={ingestionMethod} />]
      : []),
  ];
};
