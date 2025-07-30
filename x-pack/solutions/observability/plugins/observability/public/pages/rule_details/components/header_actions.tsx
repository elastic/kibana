/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import { useFetchRule } from '../../../hooks/use_fetch_rule';
import { useKibana } from '../../../utils/kibana_react';
import { useEnableRule } from '../../../hooks/use_enable_rule';
import { useDisableRule } from '../../../hooks/use_disable_rule';
import { useRunRule } from '../../../hooks/use_run_rule';
import { useUpdateAPIKey } from '../../../hooks/use_update_api_key';
interface HeaderActionsProps {
  ruleId: string;
  isLoading: boolean;
  isRuleEditable: boolean;
  onDeleteRule: () => void;
  onEditRule: () => void;
}

export function HeaderActions({
  ruleId,
  isLoading,
  isRuleEditable,
  onDeleteRule,
  onEditRule,
}: HeaderActionsProps) {
  const { services } = useKibana();
  const {
    triggersActionsUi: {
      getRuleSnoozeModal: RuleSnoozeModal,
      getUntrackModal: UntrackAlertsModal,
      getRuleHelpers,
    },
  } = services;

  const [isRuleEditPopoverOpen, setIsRuleEditPopoverOpen] = useState(false);
  const [snoozeModalOpen, setSnoozeModalOpen] = useState<boolean>(false);
  const [isUntrackAlertsModalOpen, setIsUntrackAlertsModalOpen] = useState<boolean>(false);

  const { euiTheme } = useEuiTheme();

  const collapsedItemActionsCss = css`
    .collapsedItemActions__deleteButton {
      color: ${euiTheme.colors.textDanger};
    }
  `;

  const { mutate: enableRule } = useEnableRule();
  const { mutate: disableRule } = useDisableRule();
  const { mutate: runRule } = useRunRule();
  const { mutate: updateAPIKey } = useUpdateAPIKey();

  const onDisableModalClose = () => {
    setIsUntrackAlertsModalOpen(false);
  };

  const onDisableModalOpen = () => {
    setIsUntrackAlertsModalOpen(true);
  };

  const togglePopover = () => setIsRuleEditPopoverOpen(!isRuleEditPopoverOpen);

  const handleEditRule = () => {
    setIsRuleEditPopoverOpen(false);
    onEditRule();
  };

  const handleRemoveRule = () => {
    setIsRuleEditPopoverOpen(false);
    onDeleteRule();
  };

  const handleRunRule = () => {
    setIsRuleEditPopoverOpen(false);
    runRule({
      id: ruleId,
    });
  };

  const handleUpdateAPIKey = () => {
    setIsRuleEditPopoverOpen(false);
    updateAPIKey({
      id: ruleId,
    });
  };

  const handleEnableRule = () => {
    setIsRuleEditPopoverOpen(false);
    enableRule({
      id: ruleId,
    });
  };

  const handleDisableRule = (untrack: boolean) => {
    setIsRuleEditPopoverOpen(false);
    onDisableModalClose();
    disableRule({
      id: ruleId,
      untrack,
    });
  };

  const { rule, refetch } = useFetchRule({
    ruleId,
  });

  if (!isRuleEditable || !rule) {
    return null;
  }

  const disableRuleOption = {
    'data-test-subj': 'disableRuleButton',
    onClick: onDisableModalOpen,
    name: i18n.translate('xpack.observability.ruleDetails.disableRule', {
      defaultMessage: 'Disable',
    }),
  };

  const enableRuleOption = {
    'data-test-subj': 'enableRuleButton',
    onClick: handleEnableRule,
    name: i18n.translate('xpack.observability.ruleDetails.enableRule', {
      defaultMessage: 'Enable',
    }),
  };

  const panels = [
    {
      id: 0,
      hasFocus: false,
      items: [
        ...[rule.enabled ? disableRuleOption : enableRuleOption],
        {
          'data-test-subj': 'runRuleButton',
          onClick: handleRunRule,
          name: i18n.translate('xpack.observability.ruleDetails.runRule', {
            defaultMessage: 'Run',
          }),
        },
        {
          'data-test-subj': 'updateAPIKeyButton',
          onClick: handleUpdateAPIKey,
          name: i18n.translate('xpack.observability.ruleDetails.updateAPIkey', {
            defaultMessage: 'Update API key',
          }),
        },
        {
          isSeparator: true as const,
        },
        {
          icon: 'pencil',
          'data-test-subj': 'editRuleButton',
          onClick: handleEditRule,
          name: i18n.translate('xpack.observability.ruleDetails.editRule', {
            defaultMessage: 'Edit',
          }),
        },
        {
          icon: 'trash',
          'data-test-subj': 'deleteRuleButton',
          className: 'collapsedItemActions__deleteButton',
          onClick: handleRemoveRule,
          name: i18n.translate('xpack.observability.ruleDetails.deleteRule', {
            defaultMessage: 'Delete',
          }),
        },
      ],
    },
  ];

  return (
    <>
      <EuiFlexGroup
        direction="rowReverse"
        alignItems="center"
        data-test-subj={`ruleType_${rule.ruleTypeId}`}
      >
        <EuiFlexItem>
          <EuiPopover
            id="contextRuleEditMenu"
            panelPaddingSize="none"
            isOpen={isRuleEditPopoverOpen}
            closePopover={togglePopover}
            button={
              <EuiButton
                data-test-subj="actions"
                disabled={isLoading}
                fill
                iconSide="right"
                iconType="arrowDown"
                onClick={togglePopover}
              >
                {i18n.translate('xpack.observability.ruleDetails.actionsButtonLabel', {
                  defaultMessage: 'Actions',
                })}
              </EuiButton>
            }
          >
            <EuiContextMenu
              initialPanelId={0}
              panels={panels}
              className="actDetailsCollapsedItemActions"
              data-test-subj="detailsCollapsedActionPanel"
              data-testid="detailsCollapsedActionPanel"
              css={collapsedItemActionsCss}
            />
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiButtonIcon
            className="snoozeButton"
            data-test-subj="snoozeRuleButton"
            iconType={getRuleHelpers(rule).isRuleSnoozed ? 'bellSlash' : 'bell'}
            onClick={() => {
              setSnoozeModalOpen(true);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {snoozeModalOpen && (
        <RuleSnoozeModal
          rule={rule}
          onClose={() => {
            setSnoozeModalOpen(false);
            setIsRuleEditPopoverOpen(false);
          }}
          onRuleChanged={refetch}
          onLoading={noop}
        />
      )}

      {isUntrackAlertsModalOpen && (
        <UntrackAlertsModal onCancel={onDisableModalClose} onConfirm={handleDisableRule} />
      )}
    </>
  );
}
