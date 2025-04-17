/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client, estypes } from '@elastic/elasticsearch';
import {
  ActionType,
  Category,
  type SecurityWorkflowInsight,
  SourceType,
  TargetType,
} from '../types/workflow_insights';

export interface IndexedWorkflowInsights {
  data: estypes.BulkResponse;
  cleanup: () => Promise<DeletedWorkflowInsights>;
}

export interface DeletedWorkflowInsights {
  data: estypes.BulkResponse;
}

export const indexWorkflowInsights = async ({
  esClient,
  log,
  endpointId,
  os,
  count,
  antivirus,
  path,
}: {
  esClient: Client;
  log: ToolingLog;
  endpointId: string;
  os: 'windows' | 'macos' | 'linux';
  count: number;
  antivirus: string;
  path: string;
}): Promise<IndexedWorkflowInsights> => {
  log.debug(`Indexing ${count} workflow insights`);

  const operations = Array.from({ length: count }).flatMap((_, i) => {
    return [
      {
        index: {
          _index: '.edr-workflow-insights-default',
          op_type: 'create',
        },
      },
      generateWorkflowInsightsDoc({ endpointId, os, runNumber: i, antivirus, path }),
    ];
  });

  const response = await esClient.bulk({
    refresh: 'wait_for',
    operations,
  });

  if (response.errors) {
    log.error(
      `There was an error indexing workflow insights ${JSON.stringify(response.items, null, 2)}`
    );
  } else {
    log.debug(`Indexed ${count} workflow insights successfully`);
  }

  return {
    data: response,
    cleanup: deleteIndexedWorkflowInsights.bind(null, esClient, response, log),
  };
};

const deleteIndexedWorkflowInsights = async (
  esClient: Client,
  indexedWorkflowInsights: IndexedWorkflowInsights['data'],
  log: ToolingLog
): Promise<DeletedWorkflowInsights> => {
  log.debug(`Deleting ${indexedWorkflowInsights.items.length} indexed workflow insights`);
  let response: estypes.BulkResponse = {
    took: 0,
    errors: false,
    items: [],
  };

  if (indexedWorkflowInsights.items.length) {
    const idsToDelete = indexedWorkflowInsights.items
      .filter((item) => item.create)
      .map((item) => ({
        delete: {
          _index: item.create?._index,
          _id: item.create?._id,
        },
      }));

    if (idsToDelete.length) {
      response = await esClient.bulk({
        operations: idsToDelete,
      });
      log.debug('Indexed workflow insights deleted successfully');
    }
  }

  return {
    data: response,
  };
};

const generateWorkflowInsightsDoc = ({
  endpointId,
  os,
  runNumber,
  antivirus,
  path,
}: {
  endpointId: string;
  os: 'linux' | 'windows' | 'macos';
  runNumber: number;
  antivirus: string;
  path: string;
}): SecurityWorkflowInsight => {
  const currentTime = moment();
  const signatureField =
    os === 'linux'
      ? undefined
      : os === 'windows'
      ? 'process.Ext.code_signature'
      : 'process.code_signature';

  const signatureValue = os === 'linux' ? undefined : 'Elastic';
  return {
    remediation: {
      exception_list_items: [
        {
          entries: [
            {
              field: 'process.executable.caseless',
              type: 'match',
              value:
                os !== 'windows'
                  ? `/${runNumber}${path}`
                  : (() => {
                      const parts = path.split('\\'); // Split by Windows path separator
                      const lastPart = parts.pop(); // Get the last part (executable)
                      return `${parts.join('\\')}\\${runNumber}\\${lastPart}`; // Reconstruct the path
                    })(),
              operator: 'included',
            },
            ...(signatureField && signatureValue
              ? [
                  {
                    field: signatureField,
                    operator: 'included' as const,
                    type: 'match' as const,
                    value: signatureValue,
                  },
                ]
              : []),
          ],
          list_id: 'endpoint_trusted_apps',
          name: `${antivirus}`,
          os_types: [os],
          description: 'Suggested by Automatic Troubleshooting',
          tags: ['policy:all'],
        },
      ],
    },
    metadata: {
      notes: {
        llm_model: '',
      },
      display_name: `${antivirus}`,
    },
    '@timestamp': currentTime,
    action: {
      type: ActionType.Refreshed,
      timestamp: currentTime,
    },
    source: {
      data_range_end: currentTime.clone().add(24, 'hours'),
      id: '7184ab52-c318-4c91-b765-805f889e34e2',
      type: SourceType.LlmConnector,
      data_range_start: currentTime,
    },
    message: 'Incompatible antiviruses detected',
    category: Category.Endpoint,
    type: 'incompatible_antivirus',
    value: `${antivirus} ${path}${signatureValue ? ` ${signatureValue}` : ''}`,
    target: {
      ids: [endpointId],
      type: TargetType.Endpoint,
    },
  };
};
