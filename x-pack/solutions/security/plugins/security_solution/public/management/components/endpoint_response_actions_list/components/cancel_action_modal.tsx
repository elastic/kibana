/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiSpacer,
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
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { i18n } from '@kbn/i18n';
import { FormattedError } from '../../formatted_error';
import { useToasts } from '../../../../common/lib/kibana';
import { useSendCancelRequest } from '../../../hooks/response_actions/use_send_cancel_request';
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
    const isMultiAgentAction = action.agents.length > 1;

    const getTestId = useTestIdGenerator(dataTestSubj);
    const authz = useUserPrivileges().endpointPrivileges;
    const isMounted = useIsMounted();
    const toast = useToasts();
    const { error, isLoading, mutateAsync: sendCancelRequest } = useSendCancelRequest();

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
      if (action.isCompleted || isLoading) {
        return false;
      }

      return Boolean(cancelApiBody.endpoint_ids.length > 0 && cancelApiBody.parameters.id);
    }, [
      action.isCompleted,
      cancelApiBody.endpoint_ids.length,
      cancelApiBody.parameters.id,
      isLoading,
    ]);

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

    const submitCancelAction = useCallback(() => {
      sendCancelRequest(cancelApiBody).then(() => {
        if (isMounted()) {
          toast.addSuccess(
            i18n.translate('xpack.securitySolution.cancelActionModal.successSubmit', {
              defaultMessage: 'Cancel action request sent',
            })
          );
          onClose();
        }
      });
    }, [cancelApiBody, isMounted, onClose, sendCancelRequest, toast]);

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
              {/* FIXME:PT Show info. about action/host */}

              {/* FIXME:PT show list of hosts when action was sent to multiple hosts */}

              <EuiFormRow fullWidth>
                <EuiTextArea
                  placeholder={UX_MESSAGES.cancelActionModalCommentFieldPlaceholder}
                  aria-label={UX_MESSAGES.cancelActionModalCommentFieldPlaceholder}
                  value={cancelApiBody.comment}
                  onChange={setCommentHandler}
                  fullWidth
                  compressed
                  disabled={isLoading}
                />
              </EuiFormRow>

              {action.agentType === 'endpoint' && (
                <>
                  <EuiFormRow fullWidth>
                    <EuiSwitch
                      label={CONSOLE_COMMANDS.cancel.forceArgInfo}
                      checked={Boolean(cancelApiBody.parameters.force)}
                      onChange={setForceFlag}
                      disabled={isLoading}
                    />
                  </EuiFormRow>
                </>
              )}

              {error && !isLoading && (
                <>
                  <EuiSpacer />
                  <EuiCallOut announceOnMount color="danger">
                    <FormattedError error={error} />
                  </EuiCallOut>
                </>
              )}
            </>
          )}
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButton
            isDisabled={!isReadyForSubmit}
            onClick={submitCancelAction}
            fill
            isLoading={isLoading}
          >
            {UX_MESSAGES.cancelActionModalSubmitButonLabel}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
CancelActionModal.displayName = 'CancelActionModal';
