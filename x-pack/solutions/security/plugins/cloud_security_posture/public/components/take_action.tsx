/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { HttpSetup } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n as kbnI18n } from '@kbn/i18n';
import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CREATE_DETECTION_FROM_TABLE_ROW_ACTION,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import type { RuleResponse } from '../common/types';
import { CREATE_RULE_ACTION_SUBJ, TAKE_ACTION_SUBJ } from './test_subjects';
import { useKibana } from '../common/hooks/use_kibana';
import { DETECTION_ENGINE_ALERTS_KEY, DETECTION_ENGINE_RULES_KEY } from '../common/constants';
import { CloudSecurityPostureStartServices } from '../types';

const RULE_PAGE_PATH = '/app/security/rules/id/';

interface TakeActionProps {
  createRuleFn?: (http: HttpSetup) => Promise<RuleResponse>;
  enableBenchmarkRuleFn?: () => Promise<void>;
  disableBenchmarkRuleFn?: () => Promise<void>;
  isCreateDetectionRuleDisabled?: boolean;
  isDataGridControlColumn?: boolean;
}

export const showCreateDetectionRuleErrorToast = (
  cloudSecurityStartServices: CloudSecurityPostureStartServices,
  error: Error
) => {
  return cloudSecurityStartServices.notifications.toasts.addDanger({
    title: kbnI18n.translate('xpack.csp.takeAction.createRuleErrorTitle', {
      defaultMessage: 'Unable to create detection rule',
    }),
    text: kbnI18n.translate('xpack.csp.takeAction.createRuleErrorDescription', {
      defaultMessage: 'An error occurred while creating the detection rule: {errorMessage}.',
      values: { errorMessage: error.message },
    }),
    'data-test-subj': 'csp:toast-error',
  });
};

export const showCreateDetectionRuleSuccessToast = (
  cloudSecurityStartServices: CloudSecurityPostureStartServices,
  http: HttpSetup,
  ruleResponse: RuleResponse
) => {
  const { notifications, analytics, i18n, theme } = cloudSecurityStartServices;
  const startServices = { analytics, i18n, theme };

  return notifications.toasts.addSuccess({
    toastLifeTimeMs: 10000,
    color: 'success',
    iconType: '',
    'data-test-subj': 'csp:toast-success',
    title: toMountPoint(
      <div>
        <EuiText size="m">
          <strong data-test-subj="csp:toast-success-title">{ruleResponse.name}</strong>
          {` `}
          <FormattedMessage
            id="xpack.csp.flyout.ruleCreatedToastTitle"
            defaultMessage="detection rule was created."
          />
        </EuiText>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.csp.flyout.ruleCreatedToast"
            defaultMessage="Add rule actions to get notified when alerts are generated."
          />
        </EuiText>
      </div>,
      startServices
    ),
    text: toMountPoint(
      <div>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="csp:toast-success-link"
              size="s"
              href={http.basePath.prepend(RULE_PAGE_PATH + ruleResponse.id)}
            >
              <FormattedMessage
                id="xpack.csp.flyout.ruleCreatedToastViewRuleButton"
                defaultMessage="View rule"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>,
      startServices
    ),
  });
};

/*
 * This component is used to create a detection rule from Flyout.
 * It accepts a createRuleFn parameter which is used to create a rule in a generic way.
 */
export const TakeAction = ({
  createRuleFn,
  enableBenchmarkRuleFn,
  disableBenchmarkRuleFn,
  isCreateDetectionRuleDisabled = false,
  isDataGridControlColumn: isDataTableAction = false,
}: TakeActionProps) => {
  const queryClient = useQueryClient();
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const closePopover = () => {
    setPopoverOpen(false);
  };

  const smallContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'smallContextMenuPopover',
  });

  const button = !isDataTableAction ? (
    <EuiButton
      isLoading={isLoading}
      fill
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setPopoverOpen(!isPopoverOpen)}
    >
      <FormattedMessage id="xpack.csp.flyout.takeActionButton" defaultMessage="Take action" />
    </EuiButton>
  ) : (
    <EuiButtonIcon
      aria-label={kbnI18n.translate('xpack.csp.flyout.moreActionsButton', {
        defaultMessage: 'More actions',
      })}
      iconType="boxesHorizontal"
      color="primary"
      isLoading={isLoading}
      onClick={() => setPopoverOpen(!isPopoverOpen)}
    />
  );
  const actionsItems = [];

  if (createRuleFn)
    actionsItems.push(
      <CreateDetectionRule
        key="createRule"
        createRuleFn={createRuleFn}
        setIsLoading={setIsLoading}
        closePopover={closePopover}
        queryClient={queryClient}
        isCreateDetectionRuleDisabled={isCreateDetectionRuleDisabled}
      />
    );
  if (enableBenchmarkRuleFn)
    actionsItems.push(
      <EnableBenchmarkRule
        key="enableBenchmarkRule"
        enableBenchmarkRuleFn={enableBenchmarkRuleFn}
        setIsLoading={setIsLoading}
        closePopover={closePopover}
      />
    );
  if (disableBenchmarkRuleFn)
    actionsItems.push(
      <DisableBenchmarkRule
        key="disableBenchmarkRule"
        disableBenchmarkRuleFn={disableBenchmarkRuleFn}
        setIsLoading={setIsLoading}
        closePopover={closePopover}
      />
    );

  return (
    <EuiPopover
      id={smallContextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      data-test-subj={TAKE_ACTION_SUBJ}
    >
      <EuiContextMenuPanel size="s" items={actionsItems} />
    </EuiPopover>
  );
};

const CreateDetectionRule = ({
  createRuleFn,
  setIsLoading,
  closePopover,
  queryClient,
  isCreateDetectionRuleDisabled = false,
}: {
  createRuleFn: (http: HttpSetup) => Promise<RuleResponse>;
  setIsLoading: (isLoading: boolean) => void;
  closePopover: () => void;
  queryClient: QueryClient;
  isCreateDetectionRuleDisabled: boolean;
}) => {
  const { http, ...startServices } = useKibana().services;

  const { mutate } = useMutation({
    mutationFn: () => {
      return createRuleFn(http);
    },
    onMutate: () => {
      setIsLoading(true);
      closePopover();
    },
    onSuccess: (ruleResponse) => {
      showCreateDetectionRuleSuccessToast(startServices, http, ruleResponse);
      // Triggering a refetch of rules and alerts to update the UI
      queryClient.invalidateQueries([DETECTION_ENGINE_RULES_KEY]);
      queryClient.invalidateQueries([DETECTION_ENGINE_ALERTS_KEY]);
    },
    onError: (error: Error) => {
      showCreateDetectionRuleErrorToast(startServices, error);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  return (
    <EuiContextMenuItem
      key="createRule"
      disabled={isCreateDetectionRuleDisabled}
      onClick={() => {
        mutate();
        uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, CREATE_DETECTION_FROM_TABLE_ROW_ACTION);
      }}
      data-test-subj={CREATE_RULE_ACTION_SUBJ}
    >
      <FormattedMessage
        defaultMessage="Create a detection rule"
        id="xpack.csp.createDetectionRuleButton"
      />
    </EuiContextMenuItem>
  );
};

const EnableBenchmarkRule = ({
  enableBenchmarkRuleFn,
  setIsLoading,
  closePopover,
}: {
  enableBenchmarkRuleFn: () => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
  closePopover: () => void;
}) => {
  return (
    <EuiContextMenuItem
      key="enableBenchmarkRule"
      onClick={async () => {
        closePopover();
        setIsLoading(true);
        await enableBenchmarkRuleFn();
        setIsLoading(false);
      }}
      data-test-subj={'enable-benchmark-rule-take-action-button'}
    >
      <FormattedMessage defaultMessage="Enable Rule" id="xpack.csp.enableBenchmarkRuleButton" />
    </EuiContextMenuItem>
  );
};

const DisableBenchmarkRule = ({
  disableBenchmarkRuleFn,
  setIsLoading,
  closePopover,
}: {
  disableBenchmarkRuleFn: () => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
  closePopover: () => void;
}) => {
  return (
    <EuiContextMenuItem
      key="disableBenchmarkRule"
      onClick={async () => {
        closePopover();
        setIsLoading(true);
        await disableBenchmarkRuleFn();
        setIsLoading(false);
      }}
      data-test-subj={'disable-benchmark-rule-take-action-button'}
    >
      <FormattedMessage defaultMessage="Disable Rule" id="xpack.csp.disableBenchmarkRuleButton" />
    </EuiContextMenuItem>
  );
};
