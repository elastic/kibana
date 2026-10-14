/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID } from '@kbn/workflows';
import { useShowManagedWorkflowsSetting, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import * as settingsI18n from '../settings_translations';

interface ViewExecutionsLinkProps {
  workerId: string;
  workerName: string;
  /** The Worker's managed workflow, on the Workflows app's Executions tab. */
  executionsHref: string;
}

/**
 * A Worker's execution history lives in a managed workflow, which the Workflows app only lists when
 * `workflows:ui:showManagedWorkflows` is on. With it off an admin can still be sent to the setting;
 * everyone else gets the reason instead of a link into a workflow they cannot find.
 */
export const ViewExecutionsLink: FC<ViewExecutionsLinkProps> = ({
  workerId,
  workerName,
  executionsHref,
}) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const showManagedWorkflows = useShowManagedWorkflowsSetting();
  const workflowsCapabilities = useWorkflowsCapabilities();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const testSubj = `alertZeroWorkerViewExecutions-${workerId}`;
  const ariaLabel = settingsI18n.viewExecutionsAriaLabel(workerName);
  const linkProps = {
    size: 's',
    color: 'text',
    iconType: 'external',
    iconSide: 'right',
    'aria-label': ariaLabel,
    'data-test-subj': testSubj,
  } as const;

  // EuiToolTip needs a focusable anchor; a disabled button cannot receive focus.
  const renderDisabled = (reason: string) => (
    <EuiToolTip content={reason}>
      <span aria-disabled={true} tabIndex={0}>
        <EuiButtonEmpty {...linkProps} isDisabled>
          {settingsI18n.VIEW_EXECUTIONS}
        </EuiButtonEmpty>
      </span>
    </EuiToolTip>
  );

  if (showManagedWorkflows && !workflowsCapabilities.canReadManagedWorkflowExecution) {
    return renderDisabled(settingsI18n.MANAGED_WORKFLOW_EXECUTIONS_PERMISSION_TOOLTIP);
  }

  if (showManagedWorkflows) {
    return (
      <EuiButtonEmpty
        {...linkProps}
        href={executionsHref}
        target="_blank"
        rel="noopener noreferrer"
      >
        {settingsI18n.VIEW_EXECUTIONS}
      </EuiButtonEmpty>
    );
  }

  if (application.capabilities.advancedSettings?.save !== true) {
    return renderDisabled(settingsI18n.MANAGED_WORKFLOWS_REQUIRED_TOOLTIP);
  }

  const advancedSettingsHref = application.getUrlForApp('management', {
    path: `/kibana/settings?query=${encodeURIComponent(
      WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID
    )}`,
  });

  return (
    <EuiPopover
      aria-labelledby={popoverTitleId}
      button={
        <EuiButtonEmpty {...linkProps} onClick={() => setIsPopoverOpen(true)}>
          {settingsI18n.VIEW_EXECUTIONS}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="m"
      anchorPosition="downRight"
    >
      <EuiPopoverTitle id={popoverTitleId}>
        {settingsI18n.MANAGED_WORKFLOWS_DISABLED_POPOVER_TITLE}
      </EuiPopoverTitle>
      <EuiText size="s">
        <p>{settingsI18n.MANAGED_WORKFLOWS_DISABLED_BODY}</p>
      </EuiText>
      <EuiPopoverFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={() => setIsPopoverOpen(false)}
              data-test-subj={`${testSubj}-not-now`}
            >
              {settingsI18n.MANAGED_WORKFLOWS_DISABLED_DISMISS}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              href={advancedSettingsHref}
              data-test-subj={`${testSubj}-open-advanced-settings`}
            >
              {settingsI18n.MANAGED_WORKFLOWS_DISABLED_OPEN_SETTINGS}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
