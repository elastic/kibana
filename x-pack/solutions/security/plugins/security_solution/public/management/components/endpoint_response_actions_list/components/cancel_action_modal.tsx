/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption, EuiSelectableProps, EuiSwitchEvent } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  EuiToolTip,
  EuiFormRow,
  EuiSelectable,
  EuiSpacer,
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSwitch,
  EuiTextArea,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import { i18n } from '@kbn/i18n';
import { ActionCreatedBy } from './action_created_by';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { FormattedError } from '../../formatted_error';
import { useToasts } from '../../../../common/lib/kibana';
import { useSendCancelRequest } from '../../../hooks/response_actions/use_send_cancel_request';
import { useFetchEndpointList } from '../../../hooks/endpoint/use_fetch_endpoint_list';
import { CONSOLE_COMMANDS } from '../../../common/translations';
import type { CancelActionRequestBody } from '../../../../../common/api/endpoint';
import { canUserCancelCommand } from '../../../../../common/endpoint/service/authz/cancel_authz_utils';
import type { EndpointCapabilities } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_CONSOLE_ACTION_COMMANDS_TO_ENDPOINT_CAPABILITY } from '../../../../../common/endpoint/service/response_actions/constants';
import { OUTPUT_MESSAGES, TABLE_COLUMN_NAMES, UX_MESSAGES } from '../translations';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { ActionDetails } from '../../../../../common/endpoint/types';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

/** Endpoint metadata `capabilities` required for a host to support the `cancel` response action */
const CANCEL_REQUIRED_CAPABILITIES = RESPONSE_CONSOLE_ACTION_COMMANDS_TO_ENDPOINT_CAPABILITY.cancel;

interface ResponseActionPendingInfo {
  hasMultiplePendingAgents: boolean;
  pendingAgentIds: string[];
}

const getResponseActionPendingInfo = (action: ActionDetails): ResponseActionPendingInfo => {
  const pendingAgentIds = action.agents.filter(
    (agentId) => !action.agentState[agentId].isCompleted
  );

  return {
    hasMultiplePendingAgents: pendingAgentIds.length > 1,
    pendingAgentIds,
  };
};

export interface CancelActionModalProps {
  action: ActionDetails;
  onClose: () => void;
  'data-test-subj'?: string;
}

export const CancelActionModal = memo<CancelActionModalProps>(
  ({ action, onClose, 'data-test-subj': dataTestSubj }) => {
    const { hasMultiplePendingAgents: isMultiAgentAction, pendingAgentIds } = useMemo(() => {
      return getResponseActionPendingInfo(action);
    }, [action]);

    const getTestId = useTestIdGenerator(dataTestSubj);
    const authz = useUserPrivileges().endpointPrivileges;
    const isMounted = useIsMounted();
    const toast = useToasts();
    const { error, isLoading, mutateAsync: sendCancelRequest } = useSendCancelRequest();

    const isUserPermittedToCancel = useMemo(
      () => canUserCancelCommand(authz, action.command),
      [authz, action.command]
    );

    // The `cancel` capability is reported via the endpoint's metadata document, so the check is
    // only relevant for the `endpoint` agent type. It also requires the user to have access to the
    // Endpoint Metadata API (`canReadSecuritySolution`). If either is not true, we skip the check
    // and rely on the cancel API to surface any error (as it did before this validation existed).
    const shouldCheckCapabilities: boolean =
      action.agentType === 'endpoint' &&
      authz.canReadSecuritySolution &&
      !action.isCompleted &&
      isUserPermittedToCancel &&
      pendingAgentIds.length > 0;

    const { data: endpointsListResponse, isError: isCapabilitiesError } = useFetchEndpointList(
      {
        page: 0,
        // `pageSize` must be between 1 and 10000 (per the metadata list API schema)
        pageSize: Math.min(Math.max(pendingAgentIds.length, 1), 10000),
        kuery: pendingAgentIds.map((id) => `united.endpoint.agent.id:"${id}"`).join(' or '),
      },
      { enabled: shouldCheckCapabilities }
    );

    // Build a map of `agent.id` to the capabilities reported by that endpoint's metadata document
    const capabilitiesByAgentId = useMemo(() => {
      if (!endpointsListResponse) {
        return undefined;
      }

      return endpointsListResponse.data.reduce<Record<string, EndpointCapabilities[]>>(
        (acc, hostInfo) => {
          acc[hostInfo.metadata.agent.id] = (hostInfo.metadata.Endpoint.capabilities ??
            []) as EndpointCapabilities[];

          return acc;
        },
        {}
      );
    }, [endpointsListResponse]);

    // Once the capabilities data has been retrieved (and the check applies), we can validate each
    // pending host. When the check does not apply (or errored), all hosts are treated as supported.
    const isCapabilitiesCheckAvailable: boolean =
      shouldCheckCapabilities && !isCapabilitiesError && capabilitiesByAgentId !== undefined;

    const doesAgentSupportCancel = useCallback(
      (agentId: string): boolean => {
        if (!isCapabilitiesCheckAvailable || !capabilitiesByAgentId) {
          return true;
        }

        const agentCapabilities = capabilitiesByAgentId[agentId] ?? [];

        return CANCEL_REQUIRED_CAPABILITIES.every((capability) =>
          agentCapabilities.includes(capability)
        );
      },
      [capabilitiesByAgentId, isCapabilitiesCheckAvailable]
    );

    // Show a loader (in place of the form) while the capabilities data needed for validation is
    // being retrieved.
    const isLoadingCapabilities: boolean =
      shouldCheckCapabilities && !isCapabilitiesError && capabilitiesByAgentId === undefined;

    const allPendingAgentsUnsupported: boolean = useMemo(() => {
      if (!isCapabilitiesCheckAvailable) {
        return false;
      }

      return pendingAgentIds.every((agentId) => !doesAgentSupportCancel(agentId));
    }, [doesAgentSupportCancel, isCapabilitiesCheckAvailable, pendingAgentIds]);

    const [cancelApiBody, setCancelApiBody] = useState<
      CancelActionRequestBody & { parameters: { force?: boolean } }
    >({
      endpoint_ids: !isMultiAgentAction ? pendingAgentIds : [],
      agent_type: action.agentType,
      parameters: {
        id: action.id,
        ...(action.agentType === 'endpoint' ? { force: false } : {}),
      },
      comment: '',
    });

    const isReadyForSubmit: boolean = useMemo(() => {
      if (action.isCompleted || isLoading || isLoadingCapabilities || allPendingAgentsUnsupported) {
        return false;
      }

      // For a single-agent action the pending host is pre-selected, so guard against submitting
      // when that host does not support cancel.
      if (!isMultiAgentAction && !cancelApiBody.endpoint_ids.every(doesAgentSupportCancel)) {
        return false;
      }

      return Boolean(cancelApiBody.endpoint_ids.length > 0 && cancelApiBody.parameters.id);
    }, [
      action.isCompleted,
      allPendingAgentsUnsupported,
      cancelApiBody.endpoint_ids,
      cancelApiBody.parameters.id,
      doesAgentSupportCancel,
      isLoading,
      isLoadingCapabilities,
      isMultiAgentAction,
    ]);

    const notPermittedMessage: React.ReactNode | undefined = useMemo(() => {
      let msg: string = '';

      if (action.isCompleted) {
        msg = UX_MESSAGES.cancelActionModalActionAlreadyComplete;
      } else if (!isUserPermittedToCancel) {
        msg = UX_MESSAGES.cancelActionNotPermittedTooltip;
      }

      if (msg) {
        return <EuiCallOut announceOnMount color="warning" title={msg} />;
      }
    }, [action.isCompleted, isUserPermittedToCancel]);

    const renderAgentSelectorOption: EuiSelectableProps<{
      disabledReason?: string;
    }>['renderOption'] = useCallback((option) => {
      if (!option.disabled || !option.disabledReason) {
        return option.label;
      }

      // need to manually add tooltip for disabled items due to issue: https://github.com/elastic/eui/issues/8869
      return (
        <EuiToolTip
          content={option.disabledReason}
          anchorProps={{
            css: css`
              display: block;
            `,
          }}
        >
          <>{option.label}</>
        </EuiToolTip>
      );
    }, []);

    const agentSelector = useMemo(() => {
      if (!isMultiAgentAction) {
        return <></>;
      }

      const selectionOptions = action.agents.reduce<EuiSelectableOption[]>((acc, agentId) => {
        if (action.agentState[agentId].isCompleted) {
          return acc;
        }

        const isSupported = doesAgentSupportCancel(agentId);

        acc.push({
          label: action.hosts[agentId].name || agentId,
          key: agentId,
          checked: cancelApiBody.endpoint_ids.includes(agentId) ? 'on' : undefined,
          disabled: !isSupported,
          data: {
            // This gets rendered into the Selectable via `renderOpion`
            disabledReason: isSupported
              ? undefined
              : UX_MESSAGES.cancelActionModalHostUnsupportedTooltip,
          },
        });

        return acc;
      }, []);

      return (
        <EuiFormRow
          fullWidth
          label={UX_MESSAGES.cancelActionModalHostSelectorLabel}
          labelAppend={UX_MESSAGES.cancelActionModalHostSelectorCounter(
            cancelApiBody.endpoint_ids.length,
            selectionOptions.length
          )}
        >
          <EuiSelectable
            aria-label={UX_MESSAGES.cancelActionModalAgentSelectorLabel}
            options={selectionOptions}
            renderOption={renderAgentSelectorOption}
            listProps={{ bordered: true }}
            onChange={(newOptions) => {
              setCancelApiBody((prevState) => ({
                ...prevState,
                endpoint_ids: newOptions.reduce<string[]>((acc, option) => {
                  if (option.checked === 'on' && option.key) {
                    acc.push(option.key);
                  }

                  return acc;
                }, []),
              }));
            }}
          >
            {(list) => list}
          </EuiSelectable>
        </EuiFormRow>
      );
    }, [
      action.agentState,
      action.agents,
      action.hosts,
      cancelApiBody.endpoint_ids,
      doesAgentSupportCancel,
      isMultiAgentAction,
      renderAgentSelectorOption,
    ]);

    const setCommentHandler = useCallback<React.ChangeEventHandler<HTMLTextAreaElement>>((ev) => {
      setCancelApiBody((prevState) => ({ ...prevState, comment: ev.target.value }));
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
            i18n.translate('xpack.securitySolution.cancelActionModal.successSubmitToastMessage', {
              defaultMessage:
                'Cancel action request sent. (Note that depending on your table filters, this new action may not be visible)',
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
          {notPermittedMessage ? (
            notPermittedMessage
          ) : isLoadingCapabilities ? (
            <EuiFlexGroup
              justifyContent="center"
              alignItems="center"
              direction="column"
              gutterSize="s"
              data-test-subj={getTestId('capabilitiesLoader')}
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{UX_MESSAGES.cancelActionModalLoadingCapabilities}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : allPendingAgentsUnsupported ? (
            <EuiCallOut
              announceOnMount
              color="warning"
              title={UX_MESSAGES.cancelActionModalAllHostsUnsupported}
              data-test-subj={getTestId('allHostsUnsupportedCallout')}
            />
          ) : (
            <>
              <EuiFormRow fullWidth>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="xs">
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <strong>{TABLE_COLUMN_NAMES.command}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">
                          <EuiToolTip content={action.command} anchorClassName="eui-textTruncate">
                            <EuiText
                              size="s"
                              className="eui-textTruncate eui-fullWidth"
                              data-test-subj={getTestId('actionCommand')}
                              tabIndex={0}
                            >
                              {action.command}
                            </EuiText>
                          </EuiToolTip>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="xs">
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <strong>{TABLE_COLUMN_NAMES.time}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">
                          <FormattedDate
                            fieldName={TABLE_COLUMN_NAMES.time}
                            value={action.startedAt}
                            className="eui-textTruncate"
                          />
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup
                      direction="column"
                      justifyContent="spaceBetween"
                      gutterSize="none"
                    >
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <strong>{TABLE_COLUMN_NAMES.user}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">
                          <ActionCreatedBy action={action} data-test-subj={getTestId('user')} />
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>

              {!isMultiAgentAction && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiFlexGroup gutterSize="xs" direction="column">
                    <EuiFlexItem>
                      <EuiText size="xs">
                        <strong>{OUTPUT_MESSAGES.expandSection.hostname}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem className="eui-textTruncate">
                      <EuiText size="s" className="eui-textTruncate">
                        {action.hosts[cancelApiBody.endpoint_ids[0]]?.name ||
                          cancelApiBody.endpoint_ids[0]}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              )}

              <EuiSpacer />

              {agentSelector}

              <EuiFormRow fullWidth label={UX_MESSAGES.cancelActionModalCommentLabel}>
                <EuiTextArea
                  placeholder={UX_MESSAGES.cancelActionModalCommentFieldPlaceholder}
                  aria-label={UX_MESSAGES.cancelActionModalCommentLabel}
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
                      compressed
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
