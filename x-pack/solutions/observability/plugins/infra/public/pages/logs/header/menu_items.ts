/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { INFRA_EBT_ACTIONS } from '../../../common/ebt_constants';
import {
  missingMlPrivilegesTitle,
  missingMlSetupPrivilegesDescription,
} from '../../../components/logging/log_analysis_setup/missing_privileges_messages';

export const LOGS_APP_MENU_ORDER = {
  analyzeInMl: 0,
  alerts: 1,
  addData: 2,
} as const;

const MANAGE_ML_JOBS_LABEL = i18n.translate('xpack.infra.logs.analysis.manageMlJobsButtonLabel', {
  defaultMessage: 'Manage ML jobs',
});

const RECREATE_ML_JOB_LABEL = i18n.translate('xpack.infra.logs.analysis.recreateJobButtonLabel', {
  defaultMessage: 'Recreate ML job',
});

const ANALYZE_IN_ML_LABEL = i18n.translate('xpack.infra.logs.analysis.analyzeInMlButtonLabel', {
  defaultMessage: 'Analyze in ML',
});

export function getManageMlJobsPrimaryAction(
  onClick: () => void
): NonNullable<AppHeaderMenu['primaryActionItem']> {
  return {
    id: 'manageMlJobs',
    label: MANAGE_ML_JOBS_LABEL,
    iconType: 'machineLearningApp',
    testId: 'infraManageJobsButtonManageMlJobsButton',
    ebt: { action: INFRA_EBT_ACTIONS.MANAGE_ML_JOBS },
    run: onClick,
  };
}

export function getRecreateMlJobPrimaryAction({
  hasSetupCapabilities,
  onClick,
}: {
  hasSetupCapabilities: boolean;
  onClick: () => void;
}): NonNullable<AppHeaderMenu['primaryActionItem']> {
  return {
    id: 'recreateMlJob',
    label: RECREATE_ML_JOB_LABEL,
    iconType: 'machineLearningApp',
    testId: 'infraCreateJobButtonButton',
    ebt: { action: INFRA_EBT_ACTIONS.RECREATE_ML_JOB },
    disableButton: !hasSetupCapabilities,
    tooltipTitle: hasSetupCapabilities ? undefined : missingMlPrivilegesTitle,
    tooltipContent: hasSetupCapabilities ? undefined : missingMlSetupPrivilegesDescription,
    run: onClick,
  };
}

export function getAnalyzeInMlMenuItem({
  href,
  navigateToUrl,
}: {
  href: string;
  navigateToUrl: (url: string) => void | Promise<void>;
}): NonNullable<AppHeaderMenu['items']>[number] {
  return {
    id: 'analyzeInMl',
    label: ANALYZE_IN_ML_LABEL,
    iconType: 'machineLearningApp',
    href,
    // href + run lets AppMenu use getLinkProps so left-click is SPA navigation.
    run: () => {
      void navigateToUrl(href);
    },
    testId: 'infraAnalyzeInMlButtonAnalyzeInMlButton',
    order: LOGS_APP_MENU_ORDER.analyzeInMl,
    ebt: { action: INFRA_EBT_ACTIONS.ANALYZE_IN_ML },
  };
}
