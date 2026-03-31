/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/securitysolution-exception-list-components';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { EndpointExceptionsPerPolicyOptInCallout } from '../view/components/per_policy_opt_in_callout';
import { EndpointExceptionsPerPolicyOptInModal } from '../view/components/per_policy_opt_in_modal';
import { useKibana, useToasts } from '../../../../common/lib/kibana';
import {
  useGetEndpointExceptionsPerPolicyOptIn,
  useSendEndpointExceptionsPerPolicyOptIn,
} from '../../../hooks/artifacts/use_endpoint_per_policy_opt_in';

const STORAGE_KEY = 'endpointExceptionsPerPolicyOptInCalloutDismissed';

export const usePerPolicyOptIn = (): {
  perPolicyOptInCallout: React.ReactNode | null;
  perPolicyOptInModal: React.ReactNode | null;
  perPolicyOptInActionMenuItem: Action | null;
} => {
  const { sessionStorage } = useKibana().services;
  const toasts = useToasts();
  const { canWriteAdminData, canCreateArtifactsByPolicy } = useUserPrivileges().endpointPrivileges;

  const { mutate, isLoading } = useSendEndpointExceptionsPerPolicyOptIn();
  const { data: isPerPolicyOptIn, refetch } = useGetEndpointExceptionsPerPolicyOptIn();

  const [isCalloutDismissed, setIsCalloutDismissed] = useState(
    sessionStorage.get(STORAGE_KEY) === true
  );
  const shouldShowCallout =
    canCreateArtifactsByPolicy && isPerPolicyOptIn?.status === false && !isCalloutDismissed;
  const shouldShowAction =
    canCreateArtifactsByPolicy && isPerPolicyOptIn?.status === false && canWriteAdminData;

  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleOnDismissCallout = () => {
    sessionStorage.set(STORAGE_KEY, true);
    setIsCalloutDismissed(true);
  };

  const handleOnClickUpdateDetails = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleOnDismissModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleOnConfirmModal = useCallback(() => {
    mutate(undefined, {
      onSuccess: () => {
        setIsModalVisible(false);
        refetch();

        toasts.addSuccess({
          title: i18n.translate(
            'xpack.securitySolution.endpointExceptions.perPolicyOptInModal.successTitle',
            { defaultMessage: 'Updated to policy-based exceptions' }
          ),
          text: i18n.translate(
            'xpack.securitySolution.endpointExceptions.perPolicyOptInModal.successText',
            { defaultMessage: 'You can now apply your endpoint exceptions on a policy basis.' }
          ),
        });
      },

      onError: (error) => {
        toasts.addError(error, {
          title: i18n.translate(
            'xpack.securitySolution.endpointExceptions.perPolicyOptInModal.errorTitle',
            { defaultMessage: 'Error updating to policy-based exceptions' }
          ),
        });
      },
    });
  }, [mutate, refetch, toasts]);

  return {
    perPolicyOptInCallout: shouldShowCallout ? (
      <EndpointExceptionsPerPolicyOptInCallout
        onDismiss={handleOnDismissCallout}
        onClickUpdateDetails={handleOnClickUpdateDetails}
        canOptIn={canWriteAdminData}
      />
    ) : null,

    perPolicyOptInModal: isModalVisible ? (
      <EndpointExceptionsPerPolicyOptInModal
        onDismiss={handleOnDismissModal}
        onConfirm={handleOnConfirmModal}
        isLoading={isLoading}
      />
    ) : null,

    perPolicyOptInActionMenuItem: shouldShowAction
      ? {
          key: 'perPolicyOptInActionMenuItem',
          icon: 'check',
          label: i18n.translate(
            'xpack.securitySolution.endpointExceptions.perPolicyOptInActionMenuItem.label',
            { defaultMessage: 'Update to policy-based exceptions' }
          ),
          onClick: handleOnClickUpdateDetails,
        }
      : null,
  };
};
