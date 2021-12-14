/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult, Client } from '@elastic/elasticsearch';

import {
  AttributesTypeAlerts810,
  AttributesTypeUser,
  ConnectorMappings,
} from '../../../../plugins/cases/common/api';

import { ESCasesConfigureAttributes } from '../../../../plugins/cases/server/services/configure/types';
import { ESCaseAttributes } from '../../../../plugins/cases/server/services/cases/types';

/**
 * Returns connector mappings saved objects from Elasticsearch directly.
 */
export const getConnectorMappingsFromES = async ({ es }: { es: Client }) => {
  const mappings: TransportResult<
    estypes.SearchResponse<{
      'cases-connector-mappings': ConnectorMappings;
    }>,
    unknown
  > = await es.search(
    {
      index: '.kibana',
      body: {
        query: {
          term: {
            type: {
              value: 'cases-connector-mappings',
            },
          },
        },
      },
    },
    { meta: true }
  );

  return mappings;
};

/**
 * Returns configure saved objects from Elasticsearch directly.
 */
export const getConfigureSavedObjectsFromES = async ({ es }: { es: Client }) => {
  const configure: TransportResult<
    estypes.SearchResponse<{
      'cases-configure': ESCasesConfigureAttributes;
    }>,
    unknown
  > = await es.search(
    {
      index: '.kibana',
      body: {
        query: {
          term: {
            type: {
              value: 'cases-configure',
            },
          },
        },
      },
    },
    { meta: true }
  );

  return configure;
};

export const getCaseSavedObjectsFromES = async ({ es }: { es: Client }) => {
  const configure: TransportResult<
    estypes.SearchResponse<{ cases: ESCaseAttributes }>,
    unknown
  > = await es.search(
    {
      index: '.kibana',
      body: {
        query: {
          term: {
            type: {
              value: 'cases',
            },
          },
        },
      },
    },
    { meta: true }
  );

  return configure;
};

export const findAlertAttachmentsSavedObjectsFromES = async ({ es }: { es: Client }) => {
  const alerts: TransportResult<
    estypes.SearchResponse<{ 'cases-comments': AttributesTypeAlerts810 }>
  > = await es.search(
    {
      index: '.kibana',
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  type: {
                    value: 'cases-comments',
                  },
                },
              },
              {
                term: {
                  'cases-comments.type': {
                    value: 'alert',
                  },
                },
              },
            ],
          },
        },
      },
    },
    { meta: true }
  );

  return alerts;
};

export const getAlertAttachmentSavedObjectFromES = async ({
  es,
  id,
}: {
  es: Client;
  id: string;
}) => {
  const alert: TransportResult<estypes.GetResponse<{ 'cases-comments': AttributesTypeAlerts810 }>> =
    await es.get(
      {
        id,
        index: '.kibana',
      },
      { meta: true }
    );

  return alert;
};

export const getUserAttachmentSavedObjectFromES = async ({
  es,
  id,
}: {
  es: Client;
  id: string;
}) => {
  const alert: TransportResult<estypes.GetResponse<{ 'cases-comments': AttributesTypeUser }>> =
    await es.get(
      {
        id,
        index: '.kibana',
      },
      { meta: true }
    );

  return alert;
};
