/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { useEndpointExceptionsCapability } from '../../../../exceptions/hooks/use_endpoint_exceptions_capability';
import { useUserData } from '../../user_info';
import { ACTION_ADD_ENDPOINT_EXCEPTION, ACTION_ADD_EXCEPTION } from '../translations';
import type { AlertTableContextMenuItem } from '../types';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

export interface UseExceptionActionProps {
  isEndpointAlert: boolean;
  onAddExceptionTypeClick: (type?: ExceptionListTypeEnum) => void;
}

export const useAlertExceptionActions = ({
  isEndpointAlert,
  onAddExceptionTypeClick,
}: UseExceptionActionProps) => {
  const canEditExceptions = useUserPrivileges().rulesPrivileges.exceptions.edit;
  const [{ hasIndexWrite }] = useUserData();
  const canWriteEndpointExceptions = useEndpointExceptionsCapability('crudEndpointExceptions');

  const handleDetectionExceptionModal = useCallback(() => {
    onAddExceptionTypeClick();
  }, [onAddExceptionTypeClick]);

  const handleEndpointExceptionModal = useCallback(() => {
    onAddExceptionTypeClick(ExceptionListTypeEnum.ENDPOINT);
  }, [onAddExceptionTypeClick]);

  const disabledAddEndpointException = !canWriteEndpointExceptions || !isEndpointAlert;
  const disabledAddException = !canEditExceptions || !hasIndexWrite;

  const exceptionActionItems: AlertTableContextMenuItem[] = useMemo(
    () =>
      disabledAddException && disabledAddEndpointException
        ? []
        : [
            {
              key: 'add-endpoint-exception-menu-item',
              'data-test-subj': 'add-endpoint-exception-menu-item',
              disabled: disabledAddEndpointException,
              onClick: handleEndpointExceptionModal,
              name: ACTION_ADD_ENDPOINT_EXCEPTION,
            },
            {
              key: 'add-exception-menu-item',
              'data-test-subj': 'add-exception-menu-item',
              disabled: disabledAddException,
              onClick: handleDetectionExceptionModal,
              name: ACTION_ADD_EXCEPTION,
            },
          ],
    [
      disabledAddEndpointException,
      disabledAddException,
      handleDetectionExceptionModal,
      handleEndpointExceptionModal,
    ]
  );

  return { exceptionActionItems };
};
