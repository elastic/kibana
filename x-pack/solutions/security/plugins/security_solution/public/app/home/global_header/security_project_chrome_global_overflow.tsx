/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { i18n } from '@kbn/i18n';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMlJobsSettingsData } from '../../../common/components/ml_popover/hooks/use_ml_jobs_settings_data';
import { MlJobsSettingsFlyout } from '../../../common/components/ml_popover/ml_jobs_settings_flyout';
import * as mlPopoverI18n from '../../../common/components/ml_popover/translations';
import { useAddIntegrationsUrl } from '../../../common/hooks/use_add_integrations_url';
import { useKibana } from '../../../common/lib/kibana';

const ADD_INTEGRATIONS_LABEL = i18n.translate(
  'xpack.securitySolution.globalHeader.securityProjectOverflow.addIntegrations',
  {
    defaultMessage: 'Add integrations',
  }
);

const ADD_INTEGRATIONS_ORDER = 99;
const ML_JOB_SETTINGS_ORDER = 98;

/**
 * Registers the Security-specific "Add integrations" overflow action for project chrome.
 * Parent should render only when project chrome is active and the user may add data.
 */
export const SecurityProjectChromeAddIntegrationsOverflow = React.memo(() => {
  const { chrome } = useKibana().services;
  const { href } = useAddIntegrationsUrl();
  const { navigateTo } = useNavigateTo();

  const navigateToIntegrations = useCallback(() => {
    navigateTo({ url: href });
  }, [href, navigateTo]);

  useEffect(() => {
    const projectChrome = (chrome as InternalChromeStart).project;
    const addIntegrationsItem: AppMenuItemType = {
      id: 'security-solution-add-integrations',
      label: ADD_INTEGRATIONS_LABEL,
      iconType: 'indexOpen',
      order: ADD_INTEGRATIONS_ORDER,
      testId: 'add-data',
      run: navigateToIntegrations,
    };
    return projectChrome.registerGlobalOverflowItem(addIntegrationsItem);
  }, [chrome, navigateToIntegrations]);

  return null;
});

SecurityProjectChromeAddIntegrationsOverflow.displayName = 'SecurityProjectChromeAddIntegrationsOverflow';

/**
 * Registers ML job settings in the project chrome overflow and renders its flyout.
 * Parent should render only on detection routes while project chrome is active.
 */
export const SecurityProjectChromeMlOverflow = React.memo(() => {
  const { chrome } = useKibana().services;
  const mlData = useMlJobsSettingsData();
  const mlDataRef = useRef(mlData);
  mlDataRef.current = mlData;

  const [mlFlyoutOpen, setMlFlyoutOpen] = useState(false);

  const showMlOverflow = mlData.variant === 'upgrade' || mlData.variant === 'admin';

  useEffect(() => {
    if (!showMlOverflow) {
      return;
    }

    const projectChrome = (chrome as InternalChromeStart).project;
    const openMlFlyout = () => {
      setMlFlyoutOpen(true);
      const current = mlDataRef.current;
      if (current.variant === 'admin') {
        current.refreshJobs();
      }
    };

    const mlItem: AppMenuItemType = {
      id: 'security-solution-ml-job-settings',
      label: mlPopoverI18n.ML_JOB_SETTINGS,
      iconType: 'machineLearningApp',
      order: ML_JOB_SETTINGS_ORDER,
      testId: 'integrations-button',
      run: openMlFlyout,
    };

    return projectChrome.registerGlobalOverflowItem(mlItem);
  }, [chrome, showMlOverflow]);

  useEffect(() => {
    if (!showMlOverflow) {
      setMlFlyoutOpen(false);
    }
  }, [showMlOverflow]);

  if (!showMlOverflow || mlData.variant === 'hidden') {
    return null;
  }

  return (
    <MlJobsSettingsFlyout
      data={mlData}
      isOpen={mlFlyoutOpen}
      onClose={() => setMlFlyoutOpen(false)}
    />
  );
});

SecurityProjectChromeMlOverflow.displayName = 'SecurityProjectChromeMlOverflow';
