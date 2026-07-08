/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleObjectId } from '../../../../../common/api/detection_engine/model/rule_schema';
import { useKibana } from '../../../../common/lib/kibana';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../../api/hooks/use_fetch_rules_snooze_settings_query';
import { useRuleSnoozeSettings } from './use_rule_snooze_settings';
import { useUserPrivileges } from '../../../../common/components/user_privileges';

interface RuleSnoozeBadgeProps {
  /**
   * Rule's SO id (not ruleId)
   */
  ruleId: RuleObjectId;
  showTooltipInline?: boolean;
  /**
   * When provided, the snooze panel renders as a popover anchored to this element (e.g. an app menu
   * item), controlled via `isOpen`/`onClose`, instead of rendering its own badge button.
   */
  anchorElement?: HTMLElement | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function RuleSnoozeBadge({
  ruleId,
  showTooltipInline = false,
  anchorElement,
  isOpen,
  onClose,
}: RuleSnoozeBadgeProps): JSX.Element {
  const RulesListNotifyBadge = useKibana().services.triggersActionsUi.getRulesListNotifyBadge;
  const { snoozeSettings, error } = useRuleSnoozeSettings(ruleId);
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const invalidateFetchRuleSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();

  return (
    <RulesListNotifyBadge
      ruleId={ruleId}
      snoozeSettings={snoozeSettings}
      loading={!snoozeSettings && !error}
      disabled={!canEditRules || error}
      showTooltipInline={showTooltipInline}
      onRuleChanged={invalidateFetchRuleSnoozeSettings}
      anchorElement={anchorElement}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
