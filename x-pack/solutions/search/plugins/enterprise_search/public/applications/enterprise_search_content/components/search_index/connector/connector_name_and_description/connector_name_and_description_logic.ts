/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector } from '@kbn/search-connectors';

import { Actions } from '../../../../../shared/api_logic/create_api_logic';
import {
  ConnectorNameAndDescriptionApiLogic,
  PutConnectorNameAndDescriptionArgs,
  PutConnectorNameAndDescriptionResponse,
} from '../../../../api/connector/update_connector_name_and_description_api_logic';
import {
  CachedFetchIndexApiLogic,
  CachedFetchIndexApiLogicActions,
} from '../../../../api/index/cached_fetch_index_api_logic';
import { FetchIndexApiResponse } from '../../../../api/index/fetch_index_api_logic';
import { isConnectorIndex } from '../../../../utils/indices';

type NameAndDescription = Partial<Pick<Connector, 'name' | 'description'>>;

type ConnectorNameAndDescriptionActions = Pick<
  Actions<PutConnectorNameAndDescriptionArgs, PutConnectorNameAndDescriptionResponse>,
  'apiSuccess' | 'makeRequest'
> & {
  fetchIndexApiSuccess: CachedFetchIndexApiLogicActions['apiSuccess'];
  saveNameAndDescription: () => void;
  setIsEditing(isEditing: boolean): { isEditing: boolean };
  setLocalNameAndDescription(nameAndDescription: NameAndDescription): NameAndDescription;
  setNameAndDescription(nameAndDescription: NameAndDescription): NameAndDescription;
  updateLocalNameAndDescription(nameAndDescription: NameAndDescription): NameAndDescription;
};

interface ConnectorNameAndDescriptionValues {
  index: FetchIndexApiResponse;
  isEditing: boolean;
  localNameAndDescription: NameAndDescription;
  nameAndDescription: NameAndDescription;
}

export const ConnectorNameAndDescriptionLogic = kea<
  MakeLogicType<ConnectorNameAndDescriptionValues, ConnectorNameAndDescriptionActions>
>({
  actions: {
    saveNameAndDescription: true,
    setIsEditing: (isEditing: boolean) => ({
      isEditing,
    }),
    setLocalNameAndDescription: (nameAndDescription) => nameAndDescription,
    setNameAndDescription: (nameAndDescription) => nameAndDescription,
    updateLocalNameAndDescription: (nameAndDescription) => nameAndDescription,
  },
  connect: {
    actions: [
      ConnectorNameAndDescriptionApiLogic,
      ['apiError', 'apiSuccess', 'makeRequest'],
      CachedFetchIndexApiLogic,
      ['apiSuccess as fetchIndexApiSuccess'],
    ],
    values: [CachedFetchIndexApiLogic, ['indexData as index']],
  },
  events: ({ actions, values }) => ({
    afterMount: () =>
      actions.setNameAndDescription(isConnectorIndex(values.index) ? values.index.connector : {}),
  }),
  listeners: ({ actions, values }) => ({
    fetchIndexApiSuccess: (index) => {
      if (!values.isEditing && isConnectorIndex(index)) {
        actions.setNameAndDescription(index.connector);
      }
    },
    saveNameAndDescription: () => {
      if (isConnectorIndex(values.index)) {
        actions.makeRequest({
          connectorId: values.index.connector.id,
          ...values.localNameAndDescription,
        });
      }
    },
    setIsEditing: (isEditing) => {
      if (isEditing) {
        actions.setLocalNameAndDescription(values.nameAndDescription);
      }
    },
  }),
  path: ['enterprise_search', 'content', 'connector_name_and_description'],
  reducers: () => ({
    isEditing: [
      false,
      {
        apiSuccess: () => false,
        // @ts-expect-error upgrade typescript v5.1.6
        setIsEditing: (_, { isEditing }) => isEditing,
      },
    ],
    localNameAndDescription: [
      {},
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setLocalNameAndDescription: (_, nameAndDescription) => nameAndDescription,
        // @ts-expect-error upgrade typescript v5.1.6
        updateLocalNameAndDescription: (localNameAndDescription, nameAndDescription) => ({
          ...localNameAndDescription,
          ...nameAndDescription,
        }),
      },
    ],
    nameAndDescription: [
      {},
      {
        // @ts-expect-error upgrade typescript v5.1.6
        apiSuccess: (_, { description, name }) => ({ description, name }),
        // @ts-expect-error upgrade typescript v5.1.6
        setNameAndDescription: (_, nameAndDescription) => nameAndDescription,
      },
    ],
  }),
});
