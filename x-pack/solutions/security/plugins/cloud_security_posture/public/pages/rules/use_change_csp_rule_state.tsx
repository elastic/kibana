/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n as kbnI18n } from '@kbn/i18n';
import type {
  CspBenchmarkRulesBulkActionResponse,
  RuleStateAttributes,
} from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { CSP_RULES_STATES_QUERY_KEY } from './use_csp_rules_state';
import { CSPM_STATS_QUERY_KEY, KSPM_STATS_QUERY_KEY } from '../../common/api';
import { BENCHMARK_INTEGRATION_QUERY_KEY_V2 } from '../benchmarks/use_csp_benchmark_integrations';
import { CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH } from '../../../common/constants';
import { CloudSecurityPostureStartServices } from '../../types';
import { useKibana } from '../../common/hooks/use_kibana';

export type RuleStateAttributesWithoutStates = Omit<RuleStateAttributes, 'muted'>;
export interface RuleStateUpdateRequest {
  newState: 'mute' | 'unmute';
  ruleIds: RuleStateAttributesWithoutStates[];
}

export const showChangeBenchmarkRulesStatesErrorToast = (
  cloudSecurityStartServices: CloudSecurityPostureStartServices,
  error: Error
) => {
  return cloudSecurityStartServices.notifications.toasts.addDanger({
    title: kbnI18n.translate('xpack.csp.rules.changeRuleStateErrorTitle', {
      defaultMessage: 'Unable to update rule',
    }),
    text: kbnI18n.translate('xpack.csp.rules.changeRuleStateErrorText', {
      defaultMessage: 'An error occurred while updating the rule: {errorMessage}.',
      values: { errorMessage: error.message },
    }),
    'data-test-subj': 'csp:toast-error',
  });
};

const showChangeBenchmarkRuleStatesSuccessToast = (
  cloudSecurityStartServices: CloudSecurityPostureStartServices,
  data: {
    newState: RuleStateUpdateRequest['newState'];
    numberOfRules: number;
    numberOfDetectionRules: number;
  }
) => {
  const { notifications, analytics, i18n, theme } = cloudSecurityStartServices;
  const startServices = { analytics, i18n, theme };

  return notifications.toasts.addSuccess({
    toastLifeTimeMs: 10000,
    color: 'success',
    iconType: '',
    'data-test-subj': 'csp:toast-success-rule-state-change',
    title: toMountPoint(
      <EuiText size="m">
        <strong data-test-subj={`csp:toast-success-rule-title`}>
          {data.newState === 'unmute' ? (
            <FormattedMessage
              id="xpack.csp.flyout.ruleEnabledToastTitle"
              defaultMessage="Rule Enabled"
            />
          ) : (
            <FormattedMessage
              id="xpack.csp.flyout.ruleDisabledToastTitle"
              defaultMessage="Rule Disabled"
            />
          )}
        </strong>
      </EuiText>,
      startServices
    ),
    text: toMountPoint(
      <div>
        {data.newState === 'unmute' ? (
          <FormattedMessage
            id="xpack.csp.flyout.ruleEnabledToastRulesCount"
            defaultMessage="Successfully enabled {ruleCount, plural, one {# rule} other {# rules}} "
            values={{
              ruleCount: data.numberOfRules,
            }}
          />
        ) : (
          <>
            <FormattedMessage
              id="xpack.csp.flyout.ruleDisabledToastRulesCount"
              defaultMessage="Successfully disabled {ruleCount, plural, one {# rule} other {# rules}} "
              values={{
                ruleCount: data.numberOfRules,
              }}
            />
            {data.newState === 'mute' && data.numberOfDetectionRules > 0 && (
              <strong>
                <FormattedMessage
                  id="xpack.csp.flyout.ruleDisabledToastDetectionRulesCount"
                  defaultMessage=" and {detectionRuleCount, plural, one {# detection rule} other {# detection rules}}"
                  values={{
                    detectionRuleCount: data.numberOfDetectionRules,
                  }}
                />
              </strong>
            )}
          </>
        )}
      </div>,
      startServices
    ),
  });
};

export const useChangeCspRuleState = () => {
  const { http } = useKibana().services;

  const { notifications, analytics, i18n: i18nStart, theme } = useKibana().services;

  const startServices = { notifications, analytics, i18n: i18nStart, theme };

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleStateUpdateRequest: RuleStateUpdateRequest) => {
      return await http?.post<CspBenchmarkRulesBulkActionResponse>(
        CSP_BENCHMARK_RULES_BULK_ACTION_ROUTE_PATH,
        {
          version: '1',
          body: JSON.stringify({
            action: ruleStateUpdateRequest.newState,
            rules: ruleStateUpdateRequest.ruleIds,
          }),
        }
      );
    },
    onMutate: async (ruleStateUpdateRequest: RuleStateUpdateRequest) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(CSP_RULES_STATES_QUERY_KEY);

      // Snapshot the previous rules
      const previousCspRules = queryClient.getQueryData(CSP_RULES_STATES_QUERY_KEY);

      // Optimistically update to the rules that have state changes
      queryClient.setQueryData(
        CSP_RULES_STATES_QUERY_KEY,
        (currentRuleStates: Record<string, RuleStateAttributes> | undefined) => {
          if (!currentRuleStates) {
            return currentRuleStates;
          }
          return createRulesWithUpdatedState(ruleStateUpdateRequest, currentRuleStates);
        }
      );

      // Return a context object with the previous value
      return { previousCspRules };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(BENCHMARK_INTEGRATION_QUERY_KEY_V2);
      queryClient.invalidateQueries(CSPM_STATS_QUERY_KEY);
      queryClient.invalidateQueries(KSPM_STATS_QUERY_KEY);
      queryClient.invalidateQueries(CSP_RULES_STATES_QUERY_KEY);
      showChangeBenchmarkRuleStatesSuccessToast(startServices, {
        newState: variables?.newState,
        numberOfRules: Object.keys(data?.updated_benchmark_rules || {})?.length || 0,
        numberOfDetectionRules: data?.disabled_detection_rules?.length || 0,
      });
    },
    onError: (error: Error, _, context) => {
      if (context?.previousCspRules) {
        queryClient.setQueryData(CSP_RULES_STATES_QUERY_KEY, context.previousCspRules);
      }
      showChangeBenchmarkRulesStatesErrorToast(startServices, error);
    },
  });
};

export function createRulesWithUpdatedState(
  ruleStateUpdateRequest: RuleStateUpdateRequest,
  currentRuleStates: Record<string, RuleStateAttributes>
) {
  const updateRuleStates: Record<string, RuleStateAttributes> = {};
  ruleStateUpdateRequest.ruleIds.forEach((ruleId) => {
    const matchingRuleKey = Object.keys(currentRuleStates).find(
      (key) => currentRuleStates[key].rule_id === ruleId.rule_id
    );
    if (matchingRuleKey) {
      const updatedRule = {
        ...currentRuleStates[matchingRuleKey],
        muted: ruleStateUpdateRequest.newState === 'mute',
      };

      updateRuleStates[matchingRuleKey] = updatedRule;
    }
  });

  return {
    ...currentRuleStates,
    ...updateRuleStates,
  };
}
