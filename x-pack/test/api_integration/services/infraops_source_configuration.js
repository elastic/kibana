/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

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

export function InfraOpsSourceConfigurationProvider({ getService }) {
  const client = getService('infraOpsGraphQLClient');
  const log = getService('log');

  return {
    async createConfiguration(sourceId, sourceProperties) {
      log.debug(`Creating Infra UI source configuration "${sourceId}" with properties ${JSON.stringify(sourceProperties)}`);
      const response = await client.mutate({
        mutation: createSourceMutation,
        variables: {
          sourceProperties,
          sourceId,
        },
      });

      return response.data.createSource.source.version;
    },
  };
}
