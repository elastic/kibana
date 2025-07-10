/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import {
  CONNECTORS_PATH,
  NEW_INDEX_SELECT_CONNECTOR_PATH,
  NEW_CONNECTOR_FLOW_PATH,
  CONNECTOR_DETAIL_PATH,
} from '../../routes';
import { ConnectorDetailRouter } from '../connector_detail/connector_detail_router';

import { Connectors } from './connectors';
import { CreateConnector } from './create_connector';

export const ConnectorsRouter: React.FC = () => {
  return (
    <Routes>
      <Route path={NEW_INDEX_SELECT_CONNECTOR_PATH}>
        <CreateConnector />
      </Route>
      <Route path={NEW_CONNECTOR_FLOW_PATH}>
        <CreateConnector />
      </Route>
      <Route path={CONNECTORS_PATH} exact>
        <Connectors isCrawler={false} />
      </Route>
      <Route path={CONNECTOR_DETAIL_PATH}>
        <ConnectorDetailRouter />
      </Route>
    </Routes>
  );
};
