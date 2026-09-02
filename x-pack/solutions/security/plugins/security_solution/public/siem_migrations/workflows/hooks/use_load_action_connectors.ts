/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowConnectorActionTypeId } from '../../../../common/siem_migrations/parsers/tines';
import { useKibana } from '../../../common/lib/kibana';

export interface UseLoadActionConnectorsResult {
  connectorsByType: Record<WorkflowConnectorActionTypeId, ActionConnector[]>;
  isLoading: boolean;
  refetch: () => void;
}

const EMPTY_BY_TYPE: Record<WorkflowConnectorActionTypeId, ActionConnector[]> = {
  '.email': [],
  '.slack': [],
};

/**
 * Loads Actions connectors and groups the ones relevant to Tines workflow migration
 * (email / slack) by action type id.
 */
export const useLoadActionConnectors = (): UseLoadActionConnectorsResult => {
  const { http } = useKibana().services;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['siemMigrations', 'workflows', 'actionConnectors'],
    queryFn: async () => {
      const allConnectors = await loadConnectors({ http });
      const byType: Record<WorkflowConnectorActionTypeId, ActionConnector[]> = {
        '.email': [],
        '.slack': [],
      };
      for (const connector of allConnectors) {
        if (connector.isMissingSecrets) {
          continue;
        }
        if (connector.actionTypeId === '.email' || connector.actionTypeId === '.slack') {
          byType[connector.actionTypeId].push(connector);
        }
      }
      return byType;
    },
    retry: false,
  });

  return {
    connectorsByType: data ?? EMPTY_BY_TYPE,
    isLoading,
    refetch: () => {
      void refetch();
    },
  };
};
