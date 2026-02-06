/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Connector } from '@kbn/search-connectors';

import type { ElasticsearchIndexWithIngestion } from '../../../../../../common/types/indices';
import { isConnectorIndex } from '../../../utils/indices';

import { SyncsContextMenu } from './syncs_context_menu';

// Used to populate rightSideItems of an EuiPageTemplate, which is rendered right-to-left
export const getHeaderActions = (
  indexData: ElasticsearchIndexWithIngestion | undefined,
  connector?: Connector
) => {
  return [...(isConnectorIndex(indexData) || connector ? [<SyncsContextMenu />] : [])];
};
