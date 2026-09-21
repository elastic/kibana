/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useProfilingSetupStatus } from '../../components/contexts/profiling_setup_status/use_profiling_setup_status';
import { useAutoAbortedHttpClient } from '../../hooks/use_auto_aborted_http_client';

export function UniversalProfilingSetup() {
  const {
    start: {
      core: { notifications },
    },
    services: { postSetupResources },
  } = useProfilingDependencies();
  const { profilingSetupStatus, refreshProfilingSetupStatus } = useProfilingSetupStatus();
  const http = useAutoAbortedHttpClient([]);
  const [isLoading, setIsLoading] = useState(false);

  const hasRequiredRole = profilingSetupStatus?.has_required_role !== false;

  const onClick = () => {
    setIsLoading(true);
    postSetupResources({ http })
      .then(refreshProfilingSetupStatus)
      .catch((err) => {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.profiling.checkSetup.setupFailureToastTitle', {
            defaultMessage: 'Failed to complete setup',
          }),
          toastMessage: err?.body?.message ?? err.message ?? String(err),
        });
      })
      .finally(() => setIsLoading(false));
  };

  const button = (
    <EuiButton
      data-test-subj="profilingUniversalProfilingSetupButton"
      fill
      isLoading={isLoading}
      isDisabled={!hasRequiredRole}
      onClick={onClick}
    >
      {isLoading
        ? i18n.translate('xpack.profiling.noDataConfig.action.buttonLoadingLabel', {
            defaultMessage: 'Setting up Universal Profiling...',
          })
        : i18n.translate('xpack.profiling.noDataConfig.action.buttonLabel', {
            defaultMessage: 'Set up Universal Profiling',
          })}
    </EuiButton>
  );

  return (
    <EuiEmptyPrompt
      title={
        <h2>
          {i18n.translate('xpack.profiling.noDataConfig.pageTitle', {
            defaultMessage: 'Universal Profiling',
          })}
        </h2>
      }
      body={i18n.translate('xpack.profiling.noDataConfig.action.description', {
        defaultMessage:
          'Universal Profiling provides fleet-wide, whole-system, continuous profiling with zero instrumentation. Understand what lines of code are consuming compute resources, at all times, and across your entire infrastructure.',
      })}
      actions={
        hasRequiredRole ? (
          button
        ) : (
          <EuiToolTip
            content={i18n.translate('xpack.profiling.noDataConfig.action.permissionsTooltip', {
              defaultMessage: 'You need superuser permissions to set up Universal Profiling.',
            })}
          >
            {button}
          </EuiToolTip>
        )
      }
    />
  );
}
