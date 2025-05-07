/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import { useFetchRule } from '../../../hooks/use_fetch_rule';
import { useKibana } from '../../../utils/kibana_react';
import { useEnableRule } from '../../../hooks/use_enable_rule';
import { useDisableRule } from '../../../hooks/use_disable_rule';
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

  const { mutateAsync: enableRule } = useEnableRule();
  const { mutateAsync: disableRule } = useDisableRule();

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

  return (
    <>
      <EuiFlexGroup direction="rowReverse" alignItems="flexStart">
        <EuiFlexItem>
          <EuiPopover
            id="contextRuleEditMenu"
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
            <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
              <EuiButtonEmpty
                data-test-subj="snoozeRuleButton"
                size="s"
                iconType={!getRuleHelpers(rule).isRuleSnoozed ? 'bellSlash' : 'bell'}
                onClick={() => {
                  setSnoozeModalOpen(true);
                }}
              >
                <EuiText size="s">
                  {i18n.translate('xpack.observability.ruleDetails.snoozeButton.snoozeSchedule', {
                    defaultMessage: 'Update snooze schedule',
                  })}
                </EuiText>
              </EuiButtonEmpty>
              {rule.enabled ? (
                <EuiButtonEmpty
                  data-test-subj="disableRuleButton"
                  size="s"
                  iconType="pause"
                  onClick={onDisableModalOpen}
                >
                  <EuiText size="s">
                    {i18n.translate('xpack.observability.ruleDetails.disableRule', {
                      defaultMessage: 'Disable',
                    })}
                  </EuiText>
                </EuiButtonEmpty>
              ) : (
                <EuiButtonEmpty
                  data-test-subj="enableRuleButton"
                  size="s"
                  iconType="play"
                  onClick={handleEnableRule}
                >
                  <EuiText size="s">
                    {i18n.translate('xpack.observability.ruleDetails.enableRule', {
                      defaultMessage: 'Enable',
                    })}
                  </EuiText>
                </EuiButtonEmpty>
              )}
              <EuiButtonEmpty
                data-test-subj="editRuleButton"
                size="s"
                iconType="pencil"
                onClick={handleEditRule}
              >
                <EuiText size="s">
                  {i18n.translate('xpack.observability.ruleDetails.editRule', {
                    defaultMessage: 'Edit rule',
                  })}
                </EuiText>
              </EuiButtonEmpty>
              <EuiButtonEmpty
                size="s"
                iconType="trash"
                color="danger"
                onClick={handleRemoveRule}
                data-test-subj="deleteRuleButton"
              >
                <EuiText size="s">
                  {i18n.translate('xpack.observability.ruleDetails.deleteRule', {
                    defaultMessage: 'Delete rule',
                  })}
                </EuiText>
              </EuiButtonEmpty>
            </EuiFlexGroup>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      {snoozeModalOpen && (
        <RuleSnoozeModal
          rule={rule}
          onClose={() => {
            setSnoozeModalOpen(false);
            setIsRuleEditPopoverOpen(false);
          }}
          onRuleChanged={async () => {
            refetch();
          }}
          onLoading={noop}
        />
      )}

      {isUntrackAlertsModalOpen && (
        <UntrackAlertsModal onCancel={onDisableModalClose} onConfirm={handleDisableRule} />
      )}
    </>
  );
}
