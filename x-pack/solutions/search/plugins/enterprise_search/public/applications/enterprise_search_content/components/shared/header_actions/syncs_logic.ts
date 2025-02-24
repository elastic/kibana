/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector } from '@kbn/search-connectors';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import { KibanaLogic } from '../../../../shared/kibana';

import {
  CancelSyncsApiArgs,
  CancelSyncsApiLogic,
} from '../../../api/connector/cancel_syncs_api_logic';
import {
  StartAccessControlSyncApiLogic,
  StartAccessControlSyncArgs,
} from '../../../api/connector/start_access_control_sync_api_logic';
import {
  StartIncrementalSyncApiLogic,
  StartIncrementalSyncArgs,
} from '../../../api/connector/start_incremental_sync_api_logic';
import { StartSyncApiLogic, StartSyncArgs } from '../../../api/connector/start_sync_api_logic';
import {
  hasDocumentLevelSecurityFeature,
  hasIncrementalSyncFeature,
} from '../../../utils/connector_helpers';

type CancelSyncsApiActions = Actions<CancelSyncsApiArgs, {}>;
type StartSyncApiActions = Actions<StartSyncArgs, {}>;
type StartIncrementalSyncApiActions = Actions<StartIncrementalSyncArgs, {}>;
type StartAccessControlSyncApiActions = Actions<StartAccessControlSyncArgs, {}>;

export interface SyncsLogicActions {
  cancelSyncs(connector?: Connector): { connector: Connector };
  cancelSyncsApiError: CancelSyncsApiActions['apiError'];
  cancelSyncsApiSuccess: CancelSyncsApiActions['apiSuccess'];
  makeCancelSyncsRequest: CancelSyncsApiActions['makeRequest'];
  makeStartAccessControlSyncRequest: StartAccessControlSyncApiActions['makeRequest'];
  makeStartIncrementalSyncRequest: StartIncrementalSyncApiActions['makeRequest'];
  makeStartSyncRequest: StartSyncApiActions['makeRequest'];
  startAccessControlSync(connector?: Connector): { connector: Connector };
  startIncrementalSync(connector?: Connector): { connector: Connector };
  startSync(connector?: Connector): { connector: Connector };
}

export const SyncsLogic = kea<MakeLogicType<{}, SyncsLogicActions>>({
  actions: {
    cancelSyncs: (connector?: Connector) => ({ connector }),
    startAccessControlSync: (connector?: Connector) => ({ connector }),
    startIncrementalSync: (connector?: Connector) => ({ connector }),
    startSync: (connector?: Connector) => ({ connector }),
  },
  connect: {
    actions: [
      CancelSyncsApiLogic,
      [
        'apiError as cancelSyncsApiError',
        'apiSuccess as cancelSyncsApiSuccess',
        'makeRequest as makeCancelSyncsRequest',
      ],
      StartAccessControlSyncApiLogic,
      ['makeRequest as makeStartAccessControlSyncRequest'],
      StartIncrementalSyncApiLogic,
      ['makeRequest as makeStartIncrementalSyncRequest'],
      StartSyncApiLogic,
      ['makeRequest as makeStartSyncRequest'],
    ],
  },
  listeners: ({ actions }) => ({
    cancelSyncs: ({ connector }) => {
      if (connector?.id) {
        actions.makeCancelSyncsRequest({ connectorId: connector.id });
      }
    },
    startAccessControlSync: ({ connector }) => {
      if (
        connector?.id &&
        hasDocumentLevelSecurityFeature(connector) &&
        KibanaLogic.values.productFeatures.hasDocumentLevelSecurityEnabled
      ) {
        actions.makeStartAccessControlSyncRequest({ connectorId: connector.id });
      }
    },
    startIncrementalSync: ({ connector }) => {
      if (
        connector?.id &&
        hasIncrementalSyncFeature(connector) &&
        KibanaLogic.values.productFeatures.hasIncrementalSyncEnabled
      ) {
        actions.makeStartIncrementalSyncRequest({ connectorId: connector.id });
      }
    },
    startSync: ({ connector }) => {
      if (connector?.id) {
        actions.makeStartSyncRequest({ connectorId: connector.id });
      }
    },
  }),
});
