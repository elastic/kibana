/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
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
} => {
  const { sessionStorage } = useKibana().services;
  const toasts = useToasts();
  const { canOptInPerPolicyEndpointExceptions } = useUserPrivileges().endpointPrivileges;

  const { mutate, isLoading } = useSendEndpointExceptionsPerPolicyOptIn();
  const { data: isPerPolicyOptIn } = useGetEndpointExceptionsPerPolicyOptIn();

  const [isCalloutDismissed, setIsCalloutDismissed] = useState(
    sessionStorage.get(STORAGE_KEY) === true
  );
  const shouldShowCallout = isPerPolicyOptIn !== true && !isCalloutDismissed;

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
        setIsCalloutDismissed(true);

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
  }, [mutate, toasts]);

  return {
    perPolicyOptInCallout: shouldShowCallout ? (
      <EndpointExceptionsPerPolicyOptInCallout
        onDismiss={handleOnDismissCallout}
        onClickUpdateDetails={handleOnClickUpdateDetails}
        canOptIn={canOptInPerPolicyEndpointExceptions}
      />
    ) : null,

    perPolicyOptInModal: isModalVisible ? (
      <EndpointExceptionsPerPolicyOptInModal
        onDismiss={handleOnDismissModal}
        onConfirm={handleOnConfirmModal}
        isLoading={isLoading}
      />
    ) : null,
  };
};
