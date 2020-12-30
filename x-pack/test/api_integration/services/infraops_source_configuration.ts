/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

import { FtrProviderContext } from '../ftr_provider_context';
import { UpdateSourceInput, UpdateSourceResult } from '../../../plugins/infra/public/graphql/types';

const createSourceMutation = gql`
  mutation createSource($sourceId: ID!, $sourceProperties: UpdateSourceInput!) {
    createSource(id: $sourceId, sourceProperties: $sourceProperties) {
      source {
        id
        version
        configuration {
          name
          logColumns {
            ... on InfraSourceTimestampLogColumn {
              timestampColumn {
                id
              }
            }
            ... on InfraSourceMessageLogColumn {
              messageColumn {
                id
              }
            }
            ... on InfraSourceFieldLogColumn {
              fieldColumn {
                id
                field
              }
            }
          }
        }
      }
    }
  }
`;

export function InfraOpsSourceConfigurationProvider({ getService }: FtrProviderContext) {
  const client = getService('infraOpsGraphQLClient');
  const log = getService('log');

  return {
    async createConfiguration(sourceId: string, sourceProperties: UpdateSourceInput) {
      log.debug(
        `Creating Infra UI source configuration "${sourceId}" with properties ${JSON.stringify(
          sourceProperties
        )}`
      );

      const response = await client.mutate({
        mutation: createSourceMutation,
        variables: {
          sourceProperties,
          sourceId,
        },
      });

      const result: UpdateSourceResult = response.data!.createSource;
      return result.source.version;
    },
  };
}
