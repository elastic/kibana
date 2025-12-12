/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_INSTALLATION_FAILED = i18n.translate(
  'xpack.securitySolution.detectionEngine.prebuiltRules.toast.ruleInstallationFailed',
  {
    defaultMessage: 'Rule installation failed',
  }
);

export const INSTALL_RULE_SUCCESS = (succeeded: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.installRuleSuccess', {
    defaultMessage: '{succeeded, plural, one {# rule} other {# rules}} installed successfully',
    values: { succeeded },
  });

export const INSTALL_RULE_SKIPPED = (skipped: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.installRuleSkipped', {
    defaultMessage:
      '{skipped, plural, one {# rule was} other {# rules were}} skipped during installation.',
    values: { skipped },
  });

export const INSTALL_RULE_FAILED = (failed: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.installRuleFailed', {
    defaultMessage: '{failed, plural, one {# rule} other {# rules}} failed to install',
    values: { failed },
  });

export const RULE_UPGRADE_FAILED = i18n.translate(
  'xpack.securitySolution.detectionEngine.prebuiltRules.toast.ruleUpgradeFailed',
  {
    defaultMessage: 'Rule update failed',
  }
);

export const UPGRADE_RULE_SUCCESS = (succeeded: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.upgradeRuleSuccess', {
    defaultMessage: '{succeeded, plural, one {# rule} other {# rules}} updated successfully',
    values: { succeeded },
  });

export const UPGRADE_RULE_SKIPPED = (skipped: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.upgradeRuleSkipped', {
    defaultMessage:
      '{skipped, plural, one {# rule was} other {# rules were}} skipped during update.',
    values: { skipped },
  });

export const UPGRADE_RULE_FAILED = (failed: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.upgradeRuleFailed', {
    defaultMessage: '{failed, plural, one {# rule} other {# rules}} failed to update',
    values: { failed },
  });

export const RULE_REVERT_FAILED = i18n.translate(
  'xpack.securitySolution.detectionEngine.prebuiltRules.toast.ruleRevertFailed',
  {
    defaultMessage: 'Rule reversion failed',
  }
);

export const RULE_REVERT_FAILED_CONCURRENCY_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.prebuiltRules.toast.ruleRevertFailedConcurrencyMessage',
  {
    defaultMessage:
      'Something in the rule object has changed before reversion was completed. Please review the updated diff and try again.',
  }
);

export const REVERT_RULE_SUCCESS = (succeeded: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.revertRuleSuccess', {
    defaultMessage: '{succeeded, plural, one {# rule} other {# rules}} reverted successfully.',
    values: { succeeded },
  });

export const REVERT_RULE_SKIPPED = (skipped: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.prebuiltRules.toast.revertRuleSkipped', {
    defaultMessage:
      '{skipped, plural, one {# rule was} other {# rules were}} skipped during reversion.',
    values: { skipped },
  });

export const ALL_REVERT_RULES_SKIPPED = (skipped: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.prebuiltRules.toast.allRevertRuleSkipped',
    {
      defaultMessage:
        '{skipped, plural, one {# rule was} other {All # rules were}} skipped during reversion.',
      values: { skipped },
    }
  );
