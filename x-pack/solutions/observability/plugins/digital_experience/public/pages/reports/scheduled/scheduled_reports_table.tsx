/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { ScheduledReport } from '../../../../common/types/scheduled_reports';
import { canManageReports } from '../../../capabilities';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, REPORTS_EBT_ELEMENTS } from '../../../ebt_constants';
import { useFormatters } from '../../../hooks/use_formatters';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { describeSchedule } from './describe_schedule';
import { ScheduleReportFlyout } from './schedule_report_flyout';
import { useScheduledReportActions } from './use_scheduled_report_actions';
import { useScheduledReports } from './use_scheduled_reports';

const TITLE = i18n.translate('xpack.digitalExperience.reports.scheduled.title', {
  defaultMessage: 'Scheduled reports',
});

const SCHEDULE_BUTTON_LABEL = i18n.translate(
  'xpack.digitalExperience.reports.scheduled.scheduleButton',
  { defaultMessage: 'Schedule report' }
);

const ALL_ENVIRONMENTS = i18n.translate(
  'xpack.digitalExperience.reports.scheduled.allEnvironments',
  { defaultMessage: 'All environments' }
);

const NEVER_RUN = i18n.translate('xpack.digitalExperience.reports.scheduled.neverRun', {
  defaultMessage: 'Not run yet',
});

const EDIT_LABEL = i18n.translate('xpack.digitalExperience.reports.scheduled.edit', {
  defaultMessage: 'Edit',
});
const RUN_LABEL = i18n.translate('xpack.digitalExperience.reports.scheduled.run', {
  defaultMessage: 'Run now',
});
const ENABLE_LABEL = i18n.translate('xpack.digitalExperience.reports.scheduled.enable', {
  defaultMessage: 'Enable',
});
const DISABLE_LABEL = i18n.translate('xpack.digitalExperience.reports.scheduled.disable', {
  defaultMessage: 'Disable',
});
const DELETE_LABEL = i18n.translate('xpack.digitalExperience.reports.scheduled.delete', {
  defaultMessage: 'Delete',
});

const STATUS_BADGES: Record<string, { color: string; label: string } | undefined> = {
  completed: {
    color: 'success',
    label: i18n.translate('xpack.digitalExperience.reports.scheduled.completed', {
      defaultMessage: 'Completed',
    }),
  },
  failed: {
    color: 'danger',
    label: i18n.translate('xpack.digitalExperience.reports.scheduled.failed', {
      defaultMessage: 'Failed',
    }),
  },
  timed_out: {
    color: 'danger',
    label: i18n.translate('xpack.digitalExperience.reports.scheduled.timedOut', {
      defaultMessage: 'Timed out',
    }),
  },
  running: {
    color: 'primary',
    label: i18n.translate('xpack.digitalExperience.reports.scheduled.running', {
      defaultMessage: 'Running',
    }),
  },
  pending: {
    color: 'hollow',
    label: i18n.translate('xpack.digitalExperience.reports.scheduled.pending', {
      defaultMessage: 'Pending',
    }),
  },
};

const formatRecipients = (recipients: string[]): string => {
  if (recipients.length <= 2) {
    return recipients.join(', ');
  }
  return i18n.translate('xpack.digitalExperience.reports.scheduled.recipientsOverflow', {
    defaultMessage: '{first} (+{more})',
    values: { first: recipients[0], more: recipients.length - 1 },
  });
};

type FlyoutState = { mode: 'create' } | { mode: 'edit'; report: ScheduledReport };

/** Lists and manages the scheduled scorecard reports of one application. */
export function ScheduledReports({ serviceName }: { serviceName: string }) {
  const { application } = useKibanaServices();
  const { formatDate } = useFormatters();
  const canManage = canManageReports(application.capabilities);
  const { available, reports, isLoading, error, refresh } = useScheduledReports(serviceName);
  const actions = useScheduledReportActions(serviceName, refresh);
  const deleteModalTitleId = useGeneratedHtmlId();
  const [reportToDelete, setReportToDelete] = useState<ScheduledReport | undefined>();
  const [flyout, setFlyout] = useState<FlyoutState | undefined>();

  // Hide the section entirely when Workflows is unavailable on this cluster.
  if (available === false) {
    return null;
  }

  const actionsColumn: EuiBasicTableColumn<ScheduledReport> = {
    name: i18n.translate('xpack.digitalExperience.reports.scheduled.actionsColumn', {
      defaultMessage: 'Actions',
    }),
    actions: [
      {
        name: EDIT_LABEL,
        description: EDIT_LABEL,
        icon: 'pencil',
        type: 'icon',
        isPrimary: true,
        onClick: (report) => setFlyout({ mode: 'edit', report }),
        'data-test-subj': 'digitalExperienceScheduledReportEdit',
      },
      {
        name: RUN_LABEL,
        description: RUN_LABEL,
        icon: 'play',
        type: 'icon',
        isPrimary: true,
        enabled: ({ enabled }) => enabled,
        onClick: (report) => actions.run(report),
        'data-test-subj': 'digitalExperienceScheduledReportRun',
      },
      {
        name: ({ enabled }) => (enabled ? DISABLE_LABEL : ENABLE_LABEL),
        description: ({ enabled }) => (enabled ? DISABLE_LABEL : ENABLE_LABEL),
        icon: ({ enabled }) => (enabled ? 'pause' : 'check'),
        type: 'icon',
        onClick: (report) => actions.setEnabled(report, !report.enabled),
        'data-test-subj': 'digitalExperienceScheduledReportToggle',
      },
      {
        name: DELETE_LABEL,
        description: DELETE_LABEL,
        icon: 'trash',
        color: 'danger',
        type: 'icon',
        onClick: (report) => setReportToDelete(report),
        'data-test-subj': 'digitalExperienceScheduledReportDelete',
      },
    ],
  };

  const columns: Array<EuiBasicTableColumn<ScheduledReport>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.digitalExperience.reports.scheduled.nameColumn', {
        defaultMessage: 'Name',
      }),
      render: (name: string, report: ScheduledReport) =>
        canManage ? (
          <EuiLink
            data-test-subj="digitalExperienceScheduledReportName"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.EDIT_SCHEDULED_REPORT,
              element: REPORTS_EBT_ELEMENTS.SCHEDULED_REPORT_EDIT,
            })}
            onClick={() => setFlyout({ mode: 'edit', report })}
          >
            {name}
          </EuiLink>
        ) : (
          <span data-test-subj="digitalExperienceScheduledReportName">{name}</span>
        ),
    },
    {
      field: 'environment',
      name: i18n.translate('xpack.digitalExperience.reports.scheduled.environmentColumn', {
        defaultMessage: 'Environment',
      }),
      render: (environment: string | undefined) => environment ?? ALL_ENVIRONMENTS,
    },
    {
      field: 'schedule',
      name: i18n.translate('xpack.digitalExperience.reports.scheduled.scheduleColumn', {
        defaultMessage: 'Schedule',
      }),
      render: (schedule: ScheduledReport['schedule']) => describeSchedule(schedule),
    },
    {
      field: 'recipients',
      name: i18n.translate('xpack.digitalExperience.reports.scheduled.recipientsColumn', {
        defaultMessage: 'Recipients',
      }),
      render: (recipients: string[]) => formatRecipients(recipients),
    },
    {
      field: 'enabled',
      name: i18n.translate('xpack.digitalExperience.reports.scheduled.statusColumn', {
        defaultMessage: 'Status',
      }),
      render: (enabled: boolean) =>
        enabled ? (
          <EuiBadge color="success">
            {i18n.translate('xpack.digitalExperience.reports.scheduled.enabled', {
              defaultMessage: 'Enabled',
            })}
          </EuiBadge>
        ) : (
          <EuiBadge color="hollow">
            {i18n.translate('xpack.digitalExperience.reports.scheduled.disabled', {
              defaultMessage: 'Disabled',
            })}
          </EuiBadge>
        ),
    },
    {
      field: 'lastRun',
      name: i18n.translate('xpack.digitalExperience.reports.scheduled.lastRunColumn', {
        defaultMessage: 'Last run',
      }),
      render: (lastRun: ScheduledReport['lastRun']) => {
        if (!lastRun) {
          return NEVER_RUN;
        }
        const badge = STATUS_BADGES[lastRun.status];
        return (
          <>
            {formatDate(lastRun.startedAt)}{' '}
            {badge && <EuiBadge color={badge.color}>{badge.label}</EuiBadge>}
          </>
        );
      },
    },
    ...(canManage ? [actionsColumn] : []),
  ];

  return (
    <div data-test-subj="digitalExperienceScheduledReports">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {canManage && available && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="calendar"
              data-test-subj="digitalExperienceScheduledReportsCreate"
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SCHEDULE_REPORT,
                element: REPORTS_EBT_ELEMENTS.SCHEDULED_REPORT_CREATE,
              })}
              onClick={() => setFlyout({ mode: 'create' })}
            >
              {SCHEDULE_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {error ? (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceScheduledReportsError"
          retryDataTestSubj="digitalExperienceScheduledReportsRetry"
          retryEbtElement={REPORTS_EBT_ELEMENTS.SCHEDULED_REPORTS_RETRY}
          title={i18n.translate('xpack.digitalExperience.reports.scheduled.fetchError', {
            defaultMessage: 'Could not load the scheduled reports',
          })}
          error={error}
          onRetry={refresh}
        />
      ) : (
        <EuiBasicTable
          tableCaption={TITLE}
          items={reports ?? []}
          columns={columns}
          loading={isLoading}
          noItemsMessage={
            isLoading
              ? undefined
              : i18n.translate('xpack.digitalExperience.reports.scheduled.empty', {
                  defaultMessage:
                    'No scheduled reports for this application. Select Schedule report to create one.',
                })
          }
        />
      )}
      {flyout && (
        <ScheduleReportFlyout
          serviceName={serviceName}
          reportType={flyout.mode === 'edit' ? flyout.report.reportType : 'scorecard'}
          report={flyout.mode === 'edit' ? flyout.report : undefined}
          onClose={() => setFlyout(undefined)}
          onSaved={refresh}
        />
      )}
      {reportToDelete && (
        <EuiConfirmModal
          data-test-subj="digitalExperienceScheduledReportDeleteModal"
          aria-labelledby={deleteModalTitleId}
          titleProps={{ id: deleteModalTitleId }}
          title={i18n.translate('xpack.digitalExperience.reports.scheduled.deleteTitle', {
            defaultMessage: 'Delete {name}?',
            values: { name: reportToDelete.name },
          })}
          confirmButtonText={DELETE_LABEL}
          cancelButtonText={i18n.translate('xpack.digitalExperience.reports.scheduled.cancel', {
            defaultMessage: 'Cancel',
          })}
          buttonColor="danger"
          onCancel={() => setReportToDelete(undefined)}
          onConfirm={() => {
            actions.remove(reportToDelete);
            setReportToDelete(undefined);
          }}
        >
          {i18n.translate('xpack.digitalExperience.reports.scheduled.deleteBody', {
            defaultMessage: 'The scheduled report will be deleted and no longer sent.',
          })}
        </EuiConfirmModal>
      )}
    </div>
  );
}
