/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { NIGHTSHIFT_AUTOMATIONS_QUERY_KEY } from './use_fetch_automations';

type TriggerRow =
  | {
      kind: 'significant_event';
      severities?: ('80-critical' | '60-high' | '40-medium' | '20-low')[];
      statuses?: ('pending' | 'open' | 'closed' | 'dismissed')[];
      streamNames?: string[];
    }
  | {
      kind: 'alert';
      ruleNamePattern?: string;
      ruleNameMatchMode?: 'substring' | 'regex';
      alertStatus?: 'firing' | 'recovered' | 'any';
      tags?: string[];
    }
  | {
      kind: 'schedule';
      schedulePreset?: 'hourly' | 'daily' | 'weekly' | 'custom';
      cronExpression?: string;
      timezone?: string;
      scopeQuery?: string;
    };

export interface CreateAutomationParams {
  name: string;
  description?: string;
  automationType?: 'custom' | 'managed';
  trigger: { rows: TriggerRow[] };
  execution: {
    promptTemplate?: string;
    reasoningMode?: 'investigate' | 'observe';
    agentId?: string;
    connectorId?: string;
  };
  completion: {
    action?: 'create_investigation' | 'post_to_slack' | 'silent';
    targetMode?: 'thread' | 'channel' | 'self';
    destination?: string;
  };
  runtime: {
    dailyDispatchLimit?: number;
    timeoutSeconds?: number;
    dedupeWindowSeconds?: number;
    dedupeMode?: 'event_id' | 'rule_id' | 'none';
    overlapPolicy?: 'drop' | 'cancel_in_progress' | 'queue';
  };
}

export const useCreateAutomation = () => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, CreateAutomationParams>({
    mutationFn: async (params) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('POST /internal/nightshift/automations', {
        params: { body: params },
        signal: null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_AUTOMATIONS_QUERY_KEY });
    },
  });
};
