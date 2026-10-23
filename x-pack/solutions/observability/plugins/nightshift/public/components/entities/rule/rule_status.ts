/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RuleStatus } from '../../../data/rules/use_detection_rules';

export const RULE_STATUS_LABELS = {
  active: i18n.translate('xpack.nightshift.ruleFlyout.active', { defaultMessage: 'Active' }),
  inactive: i18n.translate('xpack.nightshift.ruleFlyout.inactive', { defaultMessage: 'Inactive' }),
};

export const RULE_STATUS_REASONS: Record<
  Extract<RuleStatus, { state: 'inactive' }>['reason'],
  string
> = {
  engine_paused: i18n.translate('xpack.nightshift.ruleFlyout.enginePaused', {
    defaultMessage: "The detection engine is paused, so this rule doesn't run.",
  }),
  source_disabled: i18n.translate('xpack.nightshift.ruleFlyout.sourceDisabled', {
    defaultMessage: "This rule's source is disabled, so the rule doesn't run.",
  }),
  rule_disabled: i18n.translate('xpack.nightshift.ruleFlyout.ruleDisabled', {
    defaultMessage: "This rule is disabled, so it doesn't run.",
  }),
};

export const getRuleStatusPresentation = (status: RuleStatus | undefined) => {
  if (!status) return undefined;
  return {
    iconType: status.state === 'active' ? 'checkCircle' : 'crossCircle',
    color: status.state === 'active' ? 'primary' : 'subdued',
    label: RULE_STATUS_LABELS[status.state],
    tooltip: status.state === 'inactive' ? RULE_STATUS_REASONS[status.reason] : undefined,
  } as const;
};
