/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Data-fetching hooks for the detection rules management page.
 *
 * Each hook closes over the API service via `useDetectionRulesContext`. Error
 * toasts are shown through `coreStart.notifications`; success toasts are shown
 * only for mutations so the list re-fetch does not interrupt the user.
 */

import { i18n } from '@kbn/i18n';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useDetectionRulesContext } from './detection_rules_context';
import type { ListRulesParams } from '../../services/detection_rules_api';
import type { DetectionRuleCreateProps, DetectionRuleUpdateProps } from '../../../common/api';

const RULES_QUERY_KEY = 'detectionRulesList';

// ---------------------------------------------------------------------------
// List query
// ---------------------------------------------------------------------------

/**
 * Fetches the rules list with the given filter/sort/page parameters.
 *
 * The query key includes the full params object so any param change triggers a
 * refetch automatically.
 */
export const useDetectionRules = (params: ListRulesParams) => {
  const { api, notifications } = useDetectionRulesContext();

  return useQuery({
    queryKey: [RULES_QUERY_KEY, params],
    queryFn: () => api.listRules(params),
    keepPreviousData: true,
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.securityDetections.rulesList.fetchError', {
          defaultMessage: 'Failed to load detection rules.',
        })
      );
    },
  });
};

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Enables a rule and refreshes the list. */
export const useEnableRule = () => {
  const { api, notifications } = useDetectionRulesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.enableRule(id),
    onSuccess: (rule) => {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.securityDetections.rulesList.enableSuccess', {
          defaultMessage: 'Rule "{name}" enabled.',
          values: { name: rule.name },
        })
      );
      queryClient.invalidateQueries([RULES_QUERY_KEY]);
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.securityDetections.rulesList.enableError', {
          defaultMessage: 'Failed to enable rule.',
        })
      );
    },
  });
};

/** Disables a rule and refreshes the list. */
export const useDisableRule = () => {
  const { api, notifications } = useDetectionRulesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.disableRule(id),
    onSuccess: (rule) => {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.securityDetections.rulesList.disableSuccess', {
          defaultMessage: 'Rule "{name}" disabled.',
          values: { name: rule.name },
        })
      );
      queryClient.invalidateQueries([RULES_QUERY_KEY]);
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.securityDetections.rulesList.disableError', {
          defaultMessage: 'Failed to disable rule.',
        })
      );
    },
  });
};

/** Deletes a rule and refreshes the list. */
export const useDeleteRule = () => {
  const { api, notifications } = useDetectionRulesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteRule(id),
    onSuccess: (rule) => {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.securityDetections.rulesList.deleteSuccess', {
          defaultMessage: 'Rule "{name}" deleted.',
          values: { name: rule.name },
        })
      );
      queryClient.invalidateQueries([RULES_QUERY_KEY]);
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.securityDetections.rulesList.deleteError', {
          defaultMessage: 'Failed to delete rule.',
        })
      );
    },
  });
};

// ---------------------------------------------------------------------------
// Create / update mutations
// ---------------------------------------------------------------------------

/** Creates a rule and refreshes the list. */
export const useCreateRule = () => {
  const { api, notifications } = useDetectionRulesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (props: DetectionRuleCreateProps) => api.createRule(props),
    onSuccess: (rule) => {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.securityDetections.rulesList.createSuccess', {
          defaultMessage: 'Rule "{name}" created.',
          values: { name: rule.name },
        })
      );
      queryClient.invalidateQueries([RULES_QUERY_KEY]);
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.securityDetections.rulesList.createError', {
          defaultMessage: 'Failed to create rule.',
        })
      );
    },
  });
};

/** Replaces a rule via PUT and refreshes the list. */
export const useUpdateRule = () => {
  const { api, notifications } = useDetectionRulesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, props }: { id: string; props: DetectionRuleUpdateProps }) =>
      api.updateRule(id, props),
    onSuccess: (rule) => {
      notifications.toasts.addSuccess(
        i18n.translate('xpack.securityDetections.rulesList.updateSuccess', {
          defaultMessage: 'Rule "{name}" saved.',
          values: { name: rule.name },
        })
      );
      queryClient.invalidateQueries([RULES_QUERY_KEY]);
    },
    onError: () => {
      notifications.toasts.addDanger(
        i18n.translate('xpack.securityDetections.rulesList.updateError', {
          defaultMessage: 'Failed to save rule.',
        })
      );
    },
  });
};
