/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { cloneDeep, isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useFetchAgentByAgentPolicySummary } from '../../../../hooks/policy/use_fetch_endpoint_policy_agent_summary';
import { useUpdateEndpointPolicy } from '../../../../hooks/policy/use_update_endpoint_policy';
import type { PolicySettingsFormProps } from '../policy_settings_form/policy_settings_form';
import { PolicySettingsForm } from '../policy_settings_form';
import type {
  MaybeImmutable,
  PolicyConfig,
  PolicyData,
  PolicyDetailsRouteState,
} from '../../../../../../common/endpoint/types';
import { useKibana, useToasts } from '../../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../../common';
import { getPoliciesPath } from '../../../../common/routing';
import { useNavigateToAppEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { ConfirmUpdate } from './components/policy_form_confirm_update';

export interface PolicySettingsLayoutProps {
  policy: MaybeImmutable<PolicyData>;
  setUnsavedChanges: (isModified: boolean) => void;
}

export const PolicySettingsLayout = memo<PolicySettingsLayoutProps>(
  ({ policy: _policy, setUnsavedChanges }) => {
    const policy = _policy as PolicyData;
    const {
      services: {
        application: { navigateToApp },
      },
    } = useKibana();
    const toasts = useToasts();
    const dispatch = useDispatch();
    const { state: locationRouteState } = useLocation<PolicyDetailsRouteState>();
    const { canWritePolicyManagement } = useUserPrivileges().endpointPrivileges;
    const { isLoading: isUpdating, mutateAsync: sendPolicyUpdate } = useUpdateEndpointPolicy();
    const { data: agentSummaryData } = useFetchAgentByAgentPolicySummary(policy.policy_ids);

    const [policySettings, setPolicySettings] = useState<PolicyConfig>(
      cloneDeep(policy.inputs[0].config.policy.value)
    );

    const [policyModified, setPolicyModified] = useState<boolean>(false);

    const [showConfirm, setShowConfirm] = useState<boolean>(false);
    const [routeState, setRouteState] = useState<PolicyDetailsRouteState>();

    const isEditMode = canWritePolicyManagement;
    const policyName = policy?.name ?? '';
    const routingOnCancelNavigateTo = routeState?.onCancelNavigateTo;

    const navigateToAppArguments = useMemo((): Parameters<ApplicationStart['navigateToApp']> => {
      if (routingOnCancelNavigateTo) {
        return routingOnCancelNavigateTo;
      }

      return [
        APP_UI_ID,
        {
          path: getPoliciesPath(),
        },
      ];
    }, [routingOnCancelNavigateTo]);

    const handleSettingsOnChange: PolicySettingsFormProps['onChange'] = useCallback(
      (updates) => {
        setPolicySettings(updates.updatedPolicy);
        setPolicyModified(!isEqual(updates.updatedPolicy, policy.inputs[0].config.policy.value));
      },
      [policy.inputs]
    );
    const handleCancelOnClick = useNavigateToAppEventHandler(...navigateToAppArguments);

    const handleSaveOnClick = useCallback(() => {
      setShowConfirm(true);
    }, []);

    const handleSaveCancel = useCallback(() => {
      setShowConfirm(false);
    }, []);

    const handleSaveConfirmation = useCallback(() => {
      const update = cloneDeep(policy);

      update.inputs[0].config.policy.value = policySettings;
      sendPolicyUpdate({ policy: update })
        .then(({ item: policyItem }) => {
          toasts.addSuccess({
            'data-test-subj': 'policyDetailsSuccessMessage',
            title: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.updateSuccessTitle',
              {
                defaultMessage: 'Success!',
              }
            ),
            text: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.updateSuccessMessage',
              {
                defaultMessage: 'Integration {name} has been updated.',
                values: { name: policyName },
              }
            ),
          });

          if (routeState && routeState.onSaveNavigateTo) {
            navigateToApp(...routeState.onSaveNavigateTo);
          } else {
            setPolicyModified(false);
            // Since the 'policyItem' is stored in a store and fetched as a result of an action on urlChange, we still need to dispatch an action even though Redux was removed from this component.
            dispatch({
              type: 'serverReturnedPolicyDetailsData',
              payload: {
                policyItem,
              },
            });
          }
        })
        .catch((err) => {
          toasts.addDanger({
            'data-test-subj': 'policyDetailsFailureMessage',
            title: i18n.translate(
              'xpack.securitySolution.endpoint.policy.details.updateErrorTitle',
              {
                defaultMessage: 'Failed!',
              }
            ),
            text: err.message,
          });
        });

      handleSaveCancel();
    }, [
      dispatch,
      handleSaveCancel,
      navigateToApp,
      policy,
      policyName,
      policySettings,
      routeState,
      sendPolicyUpdate,
      toasts,
    ]);

    useEffect(() => {
      if (!routeState && locationRouteState) {
        setRouteState(locationRouteState);
      }
    }, [locationRouteState, routeState]);

    useEffect(() => {
      setUnsavedChanges(policyModified);
    }, [policyModified, setUnsavedChanges]);

    return (
      <>
        {showConfirm && (
          <ConfirmUpdate
            endpointCount={agentSummaryData ? agentSummaryData.active : 0}
            onCancel={handleSaveCancel}
            onConfirm={handleSaveConfirmation}
          />
        )}

        <PolicySettingsForm
          policy={policySettings}
          onChange={handleSettingsOnChange}
          mode={isEditMode ? 'edit' : 'view'}
          data-test-subj="endpointPolicyForm"
        />

        <EuiSpacer size="xxl" />

        <KibanaPageTemplate.BottomBar paddingSize="s">
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                onClick={handleCancelOnClick}
                data-test-subj="policyDetailsCancelButton"
                disabled={isUpdating}
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.details.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            {isEditMode && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  disabled={!policyModified}
                  fill={true}
                  iconType="save"
                  data-test-subj="policyDetailsSaveButton"
                  onClick={handleSaveOnClick}
                  isLoading={isUpdating}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.policy.details.save"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </KibanaPageTemplate.BottomBar>
      </>
    );
  }
);
PolicySettingsLayout.displayName = 'PolicySettingsLayout';
