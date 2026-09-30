/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiCallOut,
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSwitch,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useFormatTimestamp } from '../common/format_timestamp';
import { RETRY_BUTTON_LABEL } from '../common/messages';
import {
  useAutomationLastRun,
  useDeleteAutomation,
  useFetchAutomations,
  useToggleAutomation,
  AUTOMATIONS_LOAD_ERROR_TITLE,
  type Automation,
} from '../hooks/use_automations';
import { useKibana } from '../hooks/use_kibana';
import { CreateAutomationFlyout } from './create_automation_flyout';

const labels = {
  title: i18n.translate('xpack.nightshift.automations.pageTitle', {
    defaultMessage: 'Automations',
  }),
  create: i18n.translate('xpack.nightshift.automations.createButton', {
    defaultMessage: 'Create automation',
  }),
  emptyTitle: i18n.translate('xpack.nightshift.automations.emptyTitle', {
    defaultMessage: 'Automations run on triggers you define',
  }),
  emptyBody: i18n.translate('xpack.nightshift.automations.emptyBody', {
    defaultMessage:
      'Create an automation to start a Nightshift investigation automatically when an alert changes status.',
  }),
  name: i18n.translate('xpack.nightshift.automations.nameColumn', { defaultMessage: 'Name' }),
  enabled: i18n.translate('xpack.nightshift.automations.enabledColumn', {
    defaultMessage: 'Enabled',
  }),
  trigger: i18n.translate('xpack.nightshift.automations.triggerColumn', {
    defaultMessage: 'Trigger',
  }),
  lastRun: i18n.translate('xpack.nightshift.automations.lastRunColumn', {
    defaultMessage: 'Last run',
  }),
  alert: i18n.translate('xpack.nightshift.automations.alertLabel', { defaultMessage: 'Alert' }),
  schedule: i18n.translate('xpack.nightshift.automations.scheduleLabel', {
    defaultMessage: 'Schedule',
  }),
  delete: i18n.translate('xpack.nightshift.automations.deleteAction', { defaultMessage: 'Delete' }),
  cancel: i18n.translate('xpack.nightshift.automations.cancelButton', { defaultMessage: 'Cancel' }),
  deleteBody: i18n.translate('xpack.nightshift.automations.deleteConfirmBody', {
    defaultMessage:
      "This automation and its backing workflow will be deleted. You can't undo this action.",
  }),
};

const getDeleteConfirmTitle = (name: string) =>
  i18n.translate('xpack.nightshift.automations.deleteConfirmTitle', {
    defaultMessage: 'Delete "{name}"?',
    values: { name },
  });

const LastRunCell = ({ id }: { id: string }): React.ReactElement => {
  const { data, isInitialLoading } = useAutomationLastRun(id);
  const formatTimestamp = useFormatTimestamp();
  const startedAt = data?.runs[0]?.startedAt;

  if (isInitialLoading) {
    return <EuiLoadingSpinner size="s" />;
  }

  return <>{startedAt ? formatTimestamp(startedAt) : '—'}</>;
};

export const AutomationsPage = (): React.ReactElement => {
  const { services } = useKibana();
  const canManage = getNightshiftCapabilities(
    services.application.capabilities.nightshift
  ).canManage;
  const { data, error, isInitialLoading, refetch } = useFetchAutomations();
  const toggleAutomation = useToggleAutomation();
  const deleteAutomation = useDeleteAutomation();
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<Automation | undefined>();
  const automations = data?.automations ?? [];

  const columns: Array<EuiBasicTableColumn<Automation>> = [
    {
      field: 'name',
      name: labels.name,
      render: (_name: string, automation: Automation) => (
        <>
          <EuiText size="s">
            <strong>{automation.name}</strong>
          </EuiText>
          {automation.description && (
            <EuiText size="xs" color="subdued">
              {automation.description}
            </EuiText>
          )}
        </>
      ),
    },
    {
      field: 'isEnabled',
      name: labels.enabled,
      render: (isEnabled: boolean, automation: Automation) => (
        <EuiSwitch
          label={labels.enabled}
          showLabel={false}
          compressed
          checked={isEnabled}
          disabled={!canManage || toggleAutomation.isLoading}
          onChange={(event) =>
            toggleAutomation.mutate({ id: automation.id, isEnabled: event.target.checked })
          }
          data-test-subj={`automationToggle-${automation.id}`}
        />
      ),
    },
    {
      field: 'trigger',
      name: labels.trigger,
      render: (trigger: Automation['trigger']) =>
        [...new Set(trigger.rows.map(({ kind }) => kind))]
          .map((kind) => (kind === 'alert' ? labels.alert : labels.schedule))
          .join(', '),
    },
    {
      name: labels.lastRun,
      render: (automation: Automation) => <LastRunCell id={automation.id} />,
    },
    ...(canManage
      ? [
          {
            name: '',
            actions: [
              {
                name: labels.delete,
                description: labels.delete,
                icon: 'trash' as const,
                type: 'icon' as const,
                onClick: (automation: Automation) => setAutomationToDelete(automation),
                'data-test-subj': 'deleteAutomation',
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <>
      <EuiPageHeader
        pageTitle={labels.title}
        rightSideItems={
          canManage
            ? [
                <EuiButton
                  data-test-subj="nightshiftAutomationsPageButton"
                  key="create"
                  fill
                  onClick={() => setIsCreateFlyoutOpen(true)}
                >
                  {labels.create}
                </EuiButton>,
              ]
            : []
        }
      />
      {isInitialLoading ? (
        <EuiLoadingSpinner size="l" />
      ) : error && !data ? (
        <EuiCallOut announceOnMount color="danger" iconType="warning">
          <p>{AUTOMATIONS_LOAD_ERROR_TITLE}</p>
          <EuiButton
            data-test-subj="nightshiftAutomationsPageButton"
            color="danger"
            onClick={() => refetch()}
            iconType="refresh"
            size="s"
          >
            {RETRY_BUTTON_LABEL}
          </EuiButton>
        </EuiCallOut>
      ) : automations.length === 0 ? (
        <EuiEmptyPrompt
          title={<h2>{labels.emptyTitle}</h2>}
          body={<p>{labels.emptyBody}</p>}
          actions={
            canManage ? (
              <EuiButton
                data-test-subj="nightshiftAutomationsPageButton"
                fill
                onClick={() => setIsCreateFlyoutOpen(true)}
              >
                {labels.create}
              </EuiButton>
            ) : undefined
          }
        />
      ) : (
        <EuiBasicTable
          items={automations}
          columns={columns}
          rowHeader="name"
          tableCaption={labels.title}
        />
      )}
      {isCreateFlyoutOpen && (
        <CreateAutomationFlyout onClose={() => setIsCreateFlyoutOpen(false)} />
      )}
      {automationToDelete && (
        <EuiConfirmModal
          title={getDeleteConfirmTitle(automationToDelete.name)}
          onCancel={() => setAutomationToDelete(undefined)}
          onConfirm={() => {
            deleteAutomation.mutate(automationToDelete.id, {
              onSuccess: () => setAutomationToDelete(undefined),
            });
          }}
          cancelButtonText={labels.cancel}
          confirmButtonText={labels.delete}
          buttonColor="danger"
          isLoading={deleteAutomation.isLoading}
          aria-label={getDeleteConfirmTitle(automationToDelete.name)}
        >
          <p>{labels.deleteBody}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};
