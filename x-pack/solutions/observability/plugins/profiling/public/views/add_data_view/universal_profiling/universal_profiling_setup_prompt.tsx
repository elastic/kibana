/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { NoDataCard } from '@kbn/shared-ux-card-no-data';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useEnabledProfilingStatus } from '../../../components/contexts/profiling_status/use_enabled_profiling_status';
import { useAutoAbortedHttpClient } from '../../../hooks/use_auto_aborted_http_client';

export function UniversalProfilingSetupPrompt() {
  const {
    start: { core },
    services: { postSetupResources },
  } = useProfilingDependencies();
  const { data, refresh } = useEnabledProfilingStatus();
  const http = useAutoAbortedHttpClient([]);
  const [postSetupLoading, setPostSetupLoading] = useState(false);

  const { docLinks, notifications } = core;
  const canSetup = data.universalProfiling.canSetup === true;

  const onClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.preventDefault();

    setPostSetupLoading(true);

    postSetupResources({ http })
      .then(() => refresh())
      .catch((err) => {
        const message = err?.body?.message ?? err.message ?? String(err);

        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.profiling.checkSetup.setupFailureToastTitle', {
            defaultMessage: 'Failed to complete setup',
          }),
          toastMessage: message,
        });
      })
      .finally(() => {
        setPostSetupLoading(false);
      });
  };

  return (
    <NoDataCard
      title={i18n.translate('xpack.profiling.noDataConfig.pageTitle', {
        defaultMessage: 'Universal Profiling',
      })}
      description={i18n.translate('xpack.profiling.noDataConfig.action.description', {
        defaultMessage:
          'Universal Profiling provides fleet-wide, whole-system, continuous profiling with zero instrumentation. Understand what lines of code are consuming compute resources, at all times, and across your entire infrastructure.',
      })}
      buttonText={
        postSetupLoading
          ? i18n.translate('xpack.profiling.noDataConfig.action.buttonLoadingLabel', {
              defaultMessage: 'Setting up Universal Profiling...',
            })
          : i18n.translate('xpack.profiling.noDataConfig.action.buttonLabel', {
              defaultMessage: 'Set up Universal Profiling',
            })
      }
      buttonIsDisabled={postSetupLoading || !canSetup}
      disabledButtonTooltipText={
        canSetup
          ? undefined
          : i18n.translate('xpack.profiling.noDataConfig.action.permissionsTooltip', {
              defaultMessage: 'You need superuser permissions to set up Universal Profiling.',
            })
      }
      onClick={onClick}
      docsLink={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/observability/${docLinks.DOC_LINK_VERSION}/profiling-get-started.html`}
      data-test-subj="profilingCheckSetupCard"
    />
  );
}
