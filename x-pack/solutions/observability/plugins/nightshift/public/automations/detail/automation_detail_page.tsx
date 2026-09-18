/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiCallOut,
  EuiConfirmModal,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { NIGHTSHIFT_APP_ROUTE } from '../../../common/constants';
import { useKibana } from '../../hooks/use_kibana';
import { useFetchAutomationById } from '../../hooks/use_fetch_automation_by_id';
import { useFetchAutomationRuns, AutomationRunRecord } from '../../hooks/use_fetch_automation_runs';
import { useUpdateAutomation } from '../../hooks/use_update_automation';
import { useDeleteAutomation } from '../../hooks/use_delete_automation';
import { useFormatTimestamp } from '../../common/format_timestamp';
import { NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM } from '../../common/url_params';
import { AutomationFlyout } from '../create_automation_flyout';

type RunResult = AutomationRunRecord['result'];

const RESULT_PRESENTATION: Record<
  RunResult,
  { label: string; color: 'success' | 'warning' | 'danger' | 'default' }
> = {
  started: { label: 'Started', color: 'success' },
  running: { label: 'Running', color: 'default' },
  skipped: { label: 'Skipped', color: 'warning' },
  failed: { label: 'Failed', color: 'danger' },
};

function useInvestigationHref(investigationId: string): string {
  const { http } = useKibana().services;
  const params = new URLSearchParams();
  params.set('view', 'investigations');
  params.set(NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM, investigationId);
  return `${http.basePath.prepend(NIGHTSHIFT_APP_ROUTE)}?${params.toString()}`;
}

function InvestigationLink({ investigationId }: { investigationId: string }) {
  const href = useInvestigationHref(investigationId);
  return (
    <EuiLink href={href}>
      {i18n.translate('xpack.nightshift.automations.detail.viewInvestigation', {
        defaultMessage: 'View investigation',
      })}
    </EuiLink>
  );
}

function TimeCell({ startedAt }: { startedAt: string | null }) {
  const formatTimestamp = useFormatTimestamp();
  if (!startedAt) return <>—</>;
  return (
    <EuiToolTip content={formatTimestamp(startedAt)}>
      <span>
        <FormattedRelative value={startedAt} />
      </span>
    </EuiToolTip>
  );
}

function ResultCell({ run }: { run: AutomationRunRecord }) {
  const presentation = RESULT_PRESENTATION[run.result];
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <span>
          <EuiBadge color={presentation.color}>{presentation.label}</EuiBadge>
        </span>
      </EuiFlexItem>
      {run.resultDetail && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {run.resultDetail}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

export function AutomationDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const {
    http: { basePath },
    application,
    observabilityShared,
    serverless,
  } = useKibana().services;
  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const { data: automation, isLoading: isAutomationLoading, error: automationError } =
    useFetchAutomationById(id);
  const { data: runsData, isLoading: isRunsLoading } = useFetchAutomationRuns(id);

  const { mutate: updateAutomation, isLoading: isToggling } = useUpdateAutomation();
  const { mutate: deleteAutomation, isLoading: isDeleting } = useDeleteAutomation();

  const automationsHref = `${basePath.prepend(NIGHTSHIFT_APP_ROUTE)}?view=automations`;

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(NIGHTSHIFT_APP_ROUTE),
        text: i18n.translate('xpack.nightshift.breadcrumbs.linkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: NIGHTSHIFT_APP_ID,
      },
      {
        href: automationsHref,
        text: i18n.translate('xpack.nightshift.automations.breadcrumb', {
          defaultMessage: 'Automations',
        }),
      },
      {
        text: automation?.name ?? id,
      },
    ],
    { serverless }
  );

  const menu = {
    primaryActionItem: {
      id: 'editAutomation',
      label: i18n.translate('xpack.nightshift.automations.detail.editLabel', {
        defaultMessage: 'Edit automation',
      }),
      iconType: 'pencil',
      run: () => setIsEditOpen(true),
      testId: 'nightshiftAutomationEditButton',
    },
    switch: {
      id: 'automationEnabled',
      label: automation?.isEnabled
        ? i18n.translate('xpack.nightshift.automations.detail.enabled', {
            defaultMessage: 'Enabled',
          })
        : i18n.translate('xpack.nightshift.automations.detail.disabled', {
            defaultMessage: 'Disabled',
          }),
      checked: automation?.isEnabled ?? false,
      onChange: (enabled: boolean) => {
        if (automation) {
          updateAutomation({ id: automation.id, updates: { isEnabled: enabled } });
        }
      },
      disabled: isToggling || !automation,
      'data-test-subj': 'nightshiftAutomationEnabledSwitch',
    },
    items: [
      {
        id: 'deleteAutomation',
        label: i18n.translate('xpack.nightshift.automations.detail.deleteLabel', {
          defaultMessage: 'Delete',
        }),
        iconType: 'trash',
        overflow: true as const,
        separator: 'above' as const,
        isDestructive: true,
        run: () => setIsDeleteConfirmOpen(true),
        testId: 'nightshiftAutomationDeleteButton',
      },
    ],
  };

  const columns: Array<EuiBasicTableColumn<AutomationRunRecord>> = [
    {
      field: 'startedAt',
      name: i18n.translate('xpack.nightshift.automations.detail.runs.timeColumn', {
        defaultMessage: 'Time',
      }),
      width: '160px',
      render: (_: unknown, run: AutomationRunRecord) => <TimeCell startedAt={run.startedAt} />,
    },
    {
      field: 'triggeredBy',
      name: i18n.translate('xpack.nightshift.automations.detail.runs.triggerColumn', {
        defaultMessage: 'Trigger',
      }),
      width: '180px',
      render: (triggeredBy: string | null) =>
        triggeredBy ? <EuiBadge color="hollow">{triggeredBy}</EuiBadge> : <>—</>,
    },
    {
      field: 'subject',
      name: i18n.translate('xpack.nightshift.automations.detail.runs.subjectColumn', {
        defaultMessage: 'Subject',
      }),
      render: (subject: string | null) =>
        subject ? (
          <EuiText size="s" className="eui-textTruncate">
            {subject}
          </EuiText>
        ) : (
          <>—</>
        ),
    },
    {
      field: 'result',
      name: i18n.translate('xpack.nightshift.automations.detail.runs.resultColumn', {
        defaultMessage: 'Result',
      }),
      width: '180px',
      render: (_: unknown, run: AutomationRunRecord) => <ResultCell run={run} />,
    },
    {
      field: 'investigationId',
      name: i18n.translate('xpack.nightshift.automations.detail.runs.investigationColumn', {
        defaultMessage: 'Investigation',
      }),
      width: '150px',
      render: (investigationId: string | null) =>
        investigationId ? <InvestigationLink investigationId={investigationId} /> : <>—</>,
    },
  ];

  const runs = runsData?.runs ?? [];

  let runsContent: React.ReactNode;
  if (isRunsLoading) {
    runsContent = (
      <EuiFlexGroup justifyContent="center" style={{ paddingTop: 32 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else if (runs.length === 0) {
    runsContent = (
      <EuiEmptyPrompt
        iconType="clock"
        title={
          <h3>
            {i18n.translate('xpack.nightshift.automations.detail.runs.emptyTitle', {
              defaultMessage: 'No runs yet',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('xpack.nightshift.automations.detail.runs.emptyBody', {
              defaultMessage:
                'This automation has not run yet. Enable it and wait for a matching trigger.',
            })}
          </p>
        }
      />
    );
  } else {
    runsContent = (
      <EuiBasicTable
        items={runs}
        columns={columns}
        rowHeader="startedAt"
        data-test-subj="nightshiftAutomationRunsTable"
      />
    );
  }

  if (isAutomationLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ paddingTop: 80 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (automationError || !automation) {
    return (
      <EuiPageTemplate>
        <EuiPageTemplate.Section>
          <EuiCallOut
            color="danger"
            iconType="error"
            title={i18n.translate('xpack.nightshift.automations.detail.errorTitle', {
              defaultMessage: 'Unable to load automation',
            })}
          >
            <p>
              {automationError instanceof Error
                ? automationError.message
                : 'The automation could not be found.'}
            </p>
          </EuiCallOut>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    );
  }

  const triggerRows =
    automation.trigger &&
    typeof automation.trigger === 'object' &&
    'rows' in automation.trigger &&
    Array.isArray(automation.trigger.rows)
      ? automation.trigger.rows
      : [];
  const triggerKinds = [...new Set(triggerRows.map((r) => r.kind).filter(Boolean))];
  const kindLabels: Record<string, string> = {
    significant_event: 'Significant events',
    alert: 'Alerts',
    schedule: 'Schedule',
  };
  const triggerSummaryText = triggerKinds.map((k) => kindLabels[k] ?? k).join(', ') || '—';

  const summaryItems = [
    {
      title: i18n.translate('xpack.nightshift.automations.detail.summary.trigger', {
        defaultMessage: 'Trigger',
      }),
      description: triggerSummaryText,
    },
    {
      title: i18n.translate('xpack.nightshift.automations.detail.summary.dailyLimit', {
        defaultMessage: 'Daily run limit',
      }),
      description:
        automation.runtime?.dailyDispatchLimit != null
          ? String(automation.runtime.dailyDispatchLimit)
          : '—',
    },
    {
      title: i18n.translate('xpack.nightshift.automations.detail.summary.agentInstructions', {
        defaultMessage: 'Agent instructions',
      }),
      description: automation.execution?.promptTemplate ?? '—',
    },
    {
      title: i18n.translate('xpack.nightshift.automations.detail.summary.created', {
        defaultMessage: 'Created',
      }),
      description: automation.createdAt
        ? new Date(automation.createdAt).toLocaleString()
        : '—',
    },
    {
      title: i18n.translate('xpack.nightshift.automations.detail.summary.updated', {
        defaultMessage: 'Last updated',
      }),
      description: automation.updatedAt
        ? new Date(automation.updatedAt).toLocaleString()
        : '—',
    },
  ];

  return (
    <ObservabilityPageTemplate
      data-test-subj="nightshiftAutomationDetailPage"
      restrictWidth={false}
      pageSectionProps={{
        color: 'subdued',
        paddingSize: 'none',
      }}
    >
      <AppHeader
        title={automation.name}
        menu={menu}
        spacing="compact"
        back={{
          href: automationsHref,
          label: i18n.translate('xpack.nightshift.automations.detail.backLabel', {
            defaultMessage: 'Automations',
          }),
        }}
      />

      <EuiPageTemplate.Section component="div" color="subdued" restrictWidth="900px">
        <EuiFlexGroup direction="column" gutterSize="l">
          {/* Config summary */}
          <EuiFlexItem>
            <EuiDescriptionList
              type="column"
              columnGutterSize="s"
              listItems={summaryItems}
              compressed
            />
          </EuiFlexItem>

          {/* Runs history */}
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.nightshift.automations.detail.runsTitle', {
                  defaultMessage: 'Run history',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            {runsContent}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>

      {isEditOpen && (
        <AutomationFlyout
          automation={automation}
          onClose={() => setIsEditOpen(false)}
          onSaved={() => setIsEditOpen(false)}
        />
      )}

      {isDeleteConfirmOpen && (
        <EuiConfirmModal
          title={i18n.translate('xpack.nightshift.automations.detail.deleteConfirm.title', {
            defaultMessage: 'Delete "{name}"?',
            values: { name: automation.name },
          })}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          onConfirm={() => {
            deleteAutomation(automation.id, {
              onSuccess: () => {
                void application.navigateToUrl(automationsHref);
              },
            });
          }}
          cancelButtonText={i18n.translate(
            'xpack.nightshift.automations.detail.deleteConfirm.cancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.nightshift.automations.detail.deleteConfirm.confirm',
            { defaultMessage: 'Delete' }
          )}
          buttonColor="danger"
          isLoading={isDeleting}
          defaultFocusedButton="cancel"
        >
          <p>
            {i18n.translate('xpack.nightshift.automations.detail.deleteConfirm.body', {
              defaultMessage:
                'This action permanently deletes the automation and its configuration. Run history will remain in workflow executions.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </ObservabilityPageTemplate>
  );
}
