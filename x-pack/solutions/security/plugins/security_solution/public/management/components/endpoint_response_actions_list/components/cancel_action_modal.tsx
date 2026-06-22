/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';
import { CONSOLE_COMMANDS } from '../../../common/translations';
import type { CancelActionRequestBody } from '../../../../../common/api/endpoint';
import { canUserCancelCommand } from '../../../../../common/endpoint/service/authz/cancel_authz_utils';
import { UX_MESSAGES } from '../translations';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { ActionDetails } from '../../../../../common/endpoint/types';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

export interface CancelActionModalProps {
  action: ActionDetails;
  onClose: () => void;
  'data-test-subj'?: string;
}

export const CancelActionModal = memo<CancelActionModalProps>(
  ({ action, onClose, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const authz = useUserPrivileges().endpointPrivileges;
    const isMultiAgentAction = action.agents.length > 1;

    const [cancelApiBody, setCancelApiBody] = useState<
      CancelActionRequestBody & { parameters: { force?: boolean } }
    >({
      endpoint_ids: !isMultiAgentAction ? [action.agents[0]] : [],
      agent_type: action.agentType,
      parameters: {
        id: action.id,
        ...(action.agentType === 'endpoint' ? { force: false } : {}),
      },
      comment: '',
    });

    const isReadyForSubmit: boolean = useMemo(() => {
      if (action.isCompleted) {
        return false;
      }

      return Boolean(cancelApiBody.endpoint_ids.length > 0 && cancelApiBody.parameters.id);
    }, [action.isCompleted, cancelApiBody.endpoint_ids.length, cancelApiBody.parameters.id]);

    const setCommentHandler = useCallback<React.ChangeEventHandler<HTMLTextAreaElement>>((ev) => {
      setCancelApiBody((prevState) => ({ ...prevState, comment: ev.target.value }));
    }, []);

    const setEndpointIdHandler = useCallback((ev) => {
      // TODO: implemmnet
    }, []);

    const setForceFlag = useCallback((ev: EuiSwitchEvent) => {
      setCancelApiBody((prevState) => ({
        ...prevState,
        parameters: {
          ...prevState.parameters,
          force: ev.target.checked,
        },
      }));
    }, []);

    const notPermittedMessage: React.ReactNode | undefined = useMemo(() => {
      let msg: string = '';

      if (action.isCompleted) {
        msg = UX_MESSAGES.cancelActionModalActionAlreadyComplete;
      } else if (!canUserCancelCommand(authz, action.command)) {
        msg = UX_MESSAGES.cancelActionNotPermittedTooltip;
      }

      if (msg) {
        return <EuiCallOut announceOnMount color="warning" title={msg} />;
      }
    }, [action.command, action.isCompleted, authz]);

    const submitCancelAction = useCallback(() => {
      // TODO:PT implement useCallback()
    }, []);

    return (
      <EuiModal
        data-test-subj={getTestId('cancelActionModal')}
        onClose={onClose}
        aria-label={UX_MESSAGES.cancelActionModalTitle}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle title={UX_MESSAGES.cancelActionModalTitle}>
            {UX_MESSAGES.cancelActionModalTitle}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {notPermittedMessage || (
            <>
              <EuiFormRow fullWidth>
                <EuiTextArea
                  placeholder={UX_MESSAGES.cancelActionModalCommentFieldPlaceholder}
                  aria-label={UX_MESSAGES.cancelActionModalCommentFieldPlaceholder}
                  value={cancelApiBody.comment}
                  onChange={setCommentHandler}
                  fullWidth
                  compressed
                />
              </EuiFormRow>

              {action.agentType === 'endpoint' && (
                <>
                  <EuiFormRow fullWidth>
                    <EuiSwitch
                      label={CONSOLE_COMMANDS.cancel.forceArgInfo}
                      checked={Boolean(cancelApiBody.parameters.force)}
                      onChange={setForceFlag}
                    />
                  </EuiFormRow>
                </>
              )}
            </>
          )}
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButton isDisabled={!isReadyForSubmit} onClick={submitCancelAction} fill>
            {UX_MESSAGES.cancelActionModalSubmitButonLabel}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
CancelActionModal.displayName = 'CancelActionModal';
