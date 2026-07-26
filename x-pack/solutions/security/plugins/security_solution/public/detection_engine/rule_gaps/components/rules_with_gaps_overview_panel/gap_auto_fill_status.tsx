/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { GAP_AUTO_FILL_DESCRIPTION } from '../../translations';
import * as i18n from './translations';
import { RuleSettingsModal } from '../rule_settings_modal';
import { useGapAutoFillSchedulerContext } from '../../context/gap_auto_fill_scheduler_context';

export const GapAutoFillStatus = React.memo(() => {
  const { canAccessGapAutoFill, scheduler, isSchedulerLoading } = useGapAutoFillSchedulerContext();

  const [isRuleSettingsModalOpen, openRuleSettingsModal, closeRuleSettingsModal] = useBoolState();
  const isStatusLoading = isSchedulerLoading && !scheduler;
  const isEnabled = scheduler?.enabled ?? false;

  if (!canAccessGapAutoFill) {
    return null;
  }

  const badgeLabel = isStatusLoading
    ? i18n.RULE_GAPS_OVERVIEW_PANEL_AUTO_GAP_FILL_STATUS_LOADING
    : isEnabled
    ? i18n.RULE_GAPS_OVERVIEW_PANEL_AUTO_GAP_FILL_STATUS_ON
    : i18n.RULE_GAPS_OVERVIEW_PANEL_AUTO_GAP_FILL_STATUS_OFF;
  const badgeColor = isEnabled ? 'success' : 'default';

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiIconTip
          aria-label={i18n.RULE_GAPS_OVERVIEW_PANEL_AUTO_GAP_FILL_STATUS_LABEL}
          content={GAP_AUTO_FILL_DESCRIPTION}
          type="info"
          color="subdued"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <b> {i18n.RULE_GAPS_OVERVIEW_PANEL_AUTO_GAP_FILL_STATUS_LABEL}</b>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge
          color={badgeColor}
          data-test-subj="gap-auto-fill-status-badge"
          onClick={openRuleSettingsModal}
          onClickAriaLabel={i18n.RULE_GAPS_OVERVIEW_PANEL_AUTO_GAP_FILL_STATUS_LABEL}
        >
          {badgeLabel}
        </EuiBadge>
      </EuiFlexItem>
      {isRuleSettingsModalOpen && (
        <RuleSettingsModal isOpen={isRuleSettingsModalOpen} onClose={closeRuleSettingsModal} />
      )}
    </EuiFlexGroup>
  );
});

GapAutoFillStatus.displayName = 'GapAutoFillStatus';
