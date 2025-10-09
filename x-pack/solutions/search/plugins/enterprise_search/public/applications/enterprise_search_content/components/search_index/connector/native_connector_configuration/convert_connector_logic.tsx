/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../../common/types/api';
import { Actions } from '../../../../../shared/api_logic/create_api_logic';
import {
  ConvertConnectorApiLogic,
  ConvertConnectorApiLogicArgs,
  ConvertConnectorApiLogicResponse,
} from '../../../../api/connector/convert_connector_api_logic';
import {
  ConnectorViewLogic,
  ConnectorViewActions,
} from '../../../connector_detail/connector_view_logic';
import { IndexViewLogic } from '../../index_view_logic';

interface ConvertConnectorValues {
  connectorId: typeof IndexViewLogic.values.connectorId;
  indexName: typeof IndexViewLogic.values.indexName;
  isLoading: boolean;
  isModalVisible: boolean;
  shouldHideModal: boolean;
  status: Status;
}

type ConvertConnectorActions = Pick<
  Actions<ConvertConnectorApiLogicArgs, ConvertConnectorApiLogicResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  fetchConnector: ConnectorViewActions['fetchConnector'];
  fetchConnectorApiSuccess: ConnectorViewActions['fetchConnectorApiSuccess'];
  convertConnector(): void;
  hideModal(): void;
  showModal(): void;
};

export const ConvertConnectorLogic = kea<
  MakeLogicType<ConvertConnectorValues, ConvertConnectorActions>
>({
  actions: {
    convertConnector: () => true,
    deleteDomain: () => true,
    hideModal: () => true,
    showModal: () => true,
  },
  connect: {
    actions: [
      ConvertConnectorApiLogic,
      ['apiError', 'apiSuccess', 'makeRequest'],
      ConnectorViewLogic,
      ['fetchConnector', 'fetchConnectorApiSuccess'],
    ],
    values: [ConvertConnectorApiLogic, ['status'], ConnectorViewLogic, ['connectorId']],
  },
  listeners: ({ actions, values }) => ({
    apiSuccess: () => {
      if (values.connectorId) {
        actions.fetchConnector({ connectorId: values.connectorId });
      }
    },
    fetchConnectorApiSuccess: () => {
      if (values.shouldHideModal) actions.hideModal();
    },
    convertConnector: () => {
      if (values.connectorId) {
        actions.makeRequest({ connectorId: values.connectorId });
      }
    },
  }),
  path: ['enterprise_search', 'convert_connector_modal'],
  reducers: {
    isModalVisible: [
      false,
      {
        apiError: () => false,
        hideModal: () => false,
        showModal: () => true,
      },
    ],
    shouldHideModal: [
      false,
      {
        apiError: () => false,
        apiSuccess: () => true,
        fetchConnectorApiSuccess: () => false,
        hideModal: () => false,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isLoading: [
      () => [selectors.status, selectors.shouldHideModal],
      (status: Status, shouldHideModal: boolean) => status === Status.LOADING || shouldHideModal,
    ],
  }),
});
