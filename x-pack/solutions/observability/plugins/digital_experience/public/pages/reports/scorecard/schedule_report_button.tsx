/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { ReportType } from '../../../../common/types/scheduled_reports';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, REPORTS_EBT_ELEMENTS } from '../../../ebt_constants';
import { ScheduleReportFlyout } from '../scheduled/schedule_report_flyout';

const SCHEDULE_LABEL = i18n.translate('xpack.digitalExperience.report.scorecard.schedule', {
  defaultMessage: 'Schedule report',
});

/** Opens the schedule report flyout prefilled for this application and environment. */
export function ScheduleReportButton({
  serviceName,
  reportType = 'scorecard',
  environment,
  environments,
}: {
  serviceName: string;
  reportType?: ReportType;
  environment?: string;
  environments?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <EuiButton
        size="s"
        iconType="calendar"
        data-test-subj="digitalExperienceScorecardSchedule"
        {...getEbtProps({
          action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SCHEDULE_REPORT,
          element: REPORTS_EBT_ELEMENTS.SCORECARD_SCHEDULE,
        })}
        onClick={() => setIsOpen(true)}
      >
        {SCHEDULE_LABEL}
      </EuiButton>
      {isOpen && (
        <ScheduleReportFlyout
          serviceName={serviceName}
          reportType={reportType}
          defaultEnvironment={environment}
          environments={environments}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
