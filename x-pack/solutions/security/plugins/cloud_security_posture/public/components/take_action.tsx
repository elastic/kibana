/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  EuiToolTip,
  focusTrapPubSub,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { HttpSetup } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n as kbnI18n } from '@kbn/i18n';
import type { QueryClient } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import {
  CREATE_DETECTION_FROM_TABLE_ROW_ACTION,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import type { RuleResponse } from '@kbn/cloud-security-posture-common';
import { CREATE_RULE_ACTION_SUBJ, TAKE_ACTION_SUBJ } from './test_subjects';
import { useKibana } from '../common/hooks/use_kibana';
import { DETECTION_ENGINE_ALERTS_KEY, DETECTION_ENGINE_RULES_KEY } from '../common/constants';
import type { CloudSecurityPostureStartServices } from '../types';

const RULE_PAGE_PATH = '/app/security/rules/id/';

/**
 * a11y: Moves focus to the given ref on mount and registers the element as a focus-trap shard
 * via focusTrapPubSub so focus can escape an open findings flyout and land on a toast.
 *
 * The double rAF waits until the flyout has applied the updated shard list from publish() before
 * attempting the focus move. On unmount, publish() is called again to clean up the shard.
 */
const useFlyoutFocusOnMount = (ref: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    let cancelled = false;
    focusTrapPubSub.publish();
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          ref.current?.focus();
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      focusTrapPubSub.publish();
    };
  }, [ref]);
};

export interface TakeActionProps {
  createRuleFn?: (http: HttpSetup) => Promise<RuleResponse>;
  enableBenchmarkRuleFn?: () => Promise<void>;
  disableBenchmarkRuleFn?: () => Promise<void>;
  isCreateDetectionRuleDisabled?: boolean;
  isDataGridControlColumn?: boolean;
}

/**
 * a11y: After rule creation the trigger (popover item / create-rule link) unmounts, so focus would
 * fall to document.body and the next Tab would land on "Skip to main content". Moving focus to
 * this toast button keeps the only actionable follow-up reachable for keyboard users. EUI pauses
 * the toast dismiss timer while the toast has focus, so the existing auto-dismiss UX is unchanged.
 *
 * When the findings flyout is open, EuiFocusTrap still traps focus inside the flyout. The
 * data-eui-includes-in-flyout-focus-trap attribute + useFlyoutFocusOnMount registers this element
 * as a focus-trap shard so focus can leave the flyout and land on the toast.
 */
export const ViewRuleToastButton = ({ href }: { href: string }) => {
  const buttonRef = useRef<HTMLAnchorElement | null>(null);
  useFlyoutFocusOnMount(buttonRef);

  return (
    <div data-eui-includes-in-flyout-focus-trap="true">
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            buttonRef={buttonRef}
            data-test-subj="csp:toast-success-link"
            size="s"
            href={href}
          >
            <FormattedMessage
              id="xpack.csp.flyout.ruleCreatedToastViewRuleButton"
              defaultMessage="View rule"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

/**
 * a11y: The global toast list uses aria-live="polite". When the action popover closes, VoiceOver
 * can lose focus and announce the page instead of the toast. Moving focus here via
 * useFlyoutFocusOnMount ensures VoiceOver reads the error message reliably, including when
 * triggered from inside an open findings flyout.
 *
 * tabIndex={-1} keeps it out of the Tab order while still allowing programmatic focus.
 */
export const ErrorToastText = ({ errorMessage }: { errorMessage: string }) => {
  const regionRef = useRef<HTMLDivElement | null>(null);
  useFlyoutFocusOnMount(regionRef);

  return (
    <div
      ref={regionRef}
      tabIndex={-1}
      data-eui-includes-in-flyout-focus-trap="true"
      data-test-subj="csp:toast-error-text"
    >
      {kbnI18n.translate('xpack.csp.takeAction.createRuleErrorDescription', {
        defaultMessage: 'An error occurred while creating the detection rule: {errorMessage}.',
        values: { errorMessage },
      })}
    </div>
  );
};

export const showCreateDetectionRuleErrorToast = (
  cloudSecurityStartServices: CloudSecurityPostureStartServices,
  error: Error
) => {
  const { notifications, analytics, i18n, theme } = cloudSecurityStartServices;
  const startServices = { analytics, i18n, theme };

  return notifications.toasts.addDanger({
    title: kbnI18n.translate('xpack.csp.takeAction.createRuleErrorTitle', {
      defaultMessage: 'Unable to create detection rule',
    }),
    text: toMountPoint(<ErrorToastText errorMessage={error.message} />, startServices),
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
      <ViewRuleToastButton href={http.basePath.prepend(RULE_PAGE_PATH + ruleResponse.id)} />,
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
      iconType="chevronSingleDown"
      iconSide="right"
      aria-haspopup="menu"
      onClick={() => setPopoverOpen(!isPopoverOpen)}
    >
      <FormattedMessage id="xpack.csp.flyout.takeActionButton" defaultMessage="Take action" />
    </EuiButton>
  ) : (
    <EuiToolTip
      content={kbnI18n.translate('xpack.csp.flyout.moreActionsButton', {
        defaultMessage: 'More actions',
      })}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        aria-label={kbnI18n.translate('xpack.csp.flyout.moreActionsButton', {
          defaultMessage: 'More actions',
        })}
        aria-haspopup="menu"
        iconType="boxesVertical"
        color="primary"
        isLoading={isLoading}
        onClick={() => setPopoverOpen(!isPopoverOpen)}
      />
    </EuiToolTip>
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
      aria-label={kbnI18n.translate('xpack.csp.flyout.actionsPopoverAriaLabel', {
        defaultMessage: 'Actions',
      })}
      panelProps={{ role: 'none' }}
    >
      <EuiContextMenuPanel items={actionsItems} />
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
      // Reset loading state before showing the toast so the trigger button is no longer
      // hasAriaDisabled when ViewRuleToastButton's focusTrapPubSub sequence runs.
      setIsLoading(false);
      showCreateDetectionRuleSuccessToast(startServices, http, ruleResponse);
      // Triggering a refetch of rules and alerts to update the UI
      queryClient.invalidateQueries([DETECTION_ENGINE_RULES_KEY]);
      queryClient.invalidateQueries([DETECTION_ENGINE_ALERTS_KEY]);
    },
    onError: (error: Error) => {
      // Reset loading state before showing the toast so the flyout focus trap has already
      // stabilised (no pending re-render) when ErrorToastText's focusTrapPubSub sequence runs.
      // Previously this lived in onSettled which fired after onError, creating a race where the
      // setIsLoading(false) re-render interrupted the double-rAF focus sequence.
      setIsLoading(false);
      showCreateDetectionRuleErrorToast(startServices, error);
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
