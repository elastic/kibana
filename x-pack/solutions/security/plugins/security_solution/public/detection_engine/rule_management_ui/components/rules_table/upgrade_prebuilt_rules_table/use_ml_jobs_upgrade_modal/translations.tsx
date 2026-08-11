/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ML_RULE_JOB_UPGRADE_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.title',
  {
    defaultMessage: 'Update rules and ML jobs together',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.description',
  {
    defaultMessage:
      'These detection rule updates change the linked ML jobs. Update the jobs in the same flow so rules and jobs stay in sync — separate job notifications should not be required.',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_BREAKING_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.breakingTitle',
  {
    defaultMessage: 'Breaking job changes',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_BREAKING_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.breakingBody',
  {
    defaultMessage:
      'Some jobs move to Entity Analytics (`_ea`) variants. Influencers and anomaly behavior can change. Existing anomaly history on the old jobs will not carry over to the new jobs.',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_AUTO_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.autoTitle',
  {
    defaultMessage: 'Automated job update',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_AUTO_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.autoBody',
  {
    defaultMessage:
      'Compatible settings (index patterns, query filters, and model memory limits when possible) will be carried over from the current jobs to the new ones.',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_DUPLICATE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.duplicateLabel',
  {
    defaultMessage: 'Duplicate existing jobs to preserve current configuration and anomaly history',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_DUPLICATE_HELP = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.duplicateHelp',
  {
    defaultMessage:
      'When selected, the system duplicates the old jobs for you before creating the updated ones. You do not need to recreate them manually.',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_JOBS_SECTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.jobsSection',
  {
    defaultMessage: 'Jobs linked to this update',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_CURRENT = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.currentJobs',
  {
    defaultMessage: 'Current',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_TARGET = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.targetJobs',
  {
    defaultMessage: 'After update',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_BREAKING_BADGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.breakingBadge',
  {
    defaultMessage: 'Breaking',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.cancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_RULES_ONLY = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.rulesOnly',
  {
    defaultMessage: 'Update rules only',
  }
);

export const ML_RULE_JOB_UPGRADE_MODAL_CONFIRM = i18n.translate(
  'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.confirm',
  {
    defaultMessage: 'Update rules and jobs',
  }
);

export const jobIdsLabel = (jobIds: string[]) =>
  jobIds.length > 0
    ? jobIds.join(', ')
    : i18n.translate(
        'xpack.securitySolution.detectionEngine.mlRuleJobUpgradeModal.noJobs',
        {
          defaultMessage: 'None',
        }
      );
