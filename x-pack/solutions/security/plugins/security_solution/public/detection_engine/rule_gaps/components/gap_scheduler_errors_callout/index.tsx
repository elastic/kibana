/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { EuiCallOut, EuiSpacer, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGapAutoFillSchedulerContext } from '../../context/gap_auto_fill_scheduler_context';
import { GapAutoFillLogsFlyout } from '../gap_auto_fill_logs';
import * as i18n from './translations';

const DISMISSAL_STORAGE_KEY = 'gap-scheduler-errors-callout-dismissed';

/**
 * A callout that displays when there are errors in the gap auto fill scheduler.
 * The callout is dismissable and will reappear if new errors occur after dismissal.
 */
export const GapSchedulerErrorsCallout = () => {
  const { canAccessGapAutoFill, scheduler, hasErrors, latestErrorTimestamp } =
    useGapAutoFillSchedulerContext();

  const [isDismissed, setIsDismissed] = useState(false);
  const [isLogsFlyoutOpen, setIsLogsFlyoutOpen] = useState(false);

  // Check dismissal status on mount and when latestErrorTimestamp changes
  useEffect(() => {
    if (!latestErrorTimestamp) return;

    const dismissedAt = localStorage.getItem(DISMISSAL_STORAGE_KEY);
    if (!dismissedAt) {
      setIsDismissed(false);
      return;
    }

    // Show callout again if there's a newer error than the dismissal time
    const hasNewerError =
      new Date(latestErrorTimestamp).getTime() > new Date(dismissedAt).getTime();

    if (hasNewerError) {
      setIsDismissed(false);
      localStorage.removeItem(DISMISSAL_STORAGE_KEY);
    } else {
      setIsDismissed(true);
    }
  }, [latestErrorTimestamp]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSAL_STORAGE_KEY, new Date().toISOString());
    setIsDismissed(true);
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setIsLogsFlyoutOpen(false);
  }, []);

  // Don't render if:
  // - User doesn't have access to gap auto fill
  // - Scheduler is not enabled
  // - No errors exist
  // - Already dismissed (and no newer errors since dismissal)
  if (!canAccessGapAutoFill || !scheduler?.enabled || !hasErrors || isDismissed) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        color="warning"
        title={i18n.GAP_SCHEDULER_ERRORS_CALLOUT_TITLE}
        iconType="warning"
        onDismiss={handleDismiss}
        data-test-subj="gap-scheduler-errors-callout"
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.gapSchedulerErrors.callout.message"
            defaultMessage="We encountered errors while scheduling gap fills. Not all gap fill runs were successfully scheduled to run. Review the {logsLink} to investigate."
            values={{
              logsLink: (
                <EuiLink
                  onClick={() => setIsLogsFlyoutOpen(true)}
                  data-test-subj="gap-scheduler-errors-logs-link"
                >
                  {i18n.GAP_SCHEDULER_ERRORS_CALLOUT_LOGS_LINK}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="s" />
      <GapAutoFillLogsFlyout isOpen={isLogsFlyoutOpen} onClose={handleCloseFlyout} />
    </>
  );
};
