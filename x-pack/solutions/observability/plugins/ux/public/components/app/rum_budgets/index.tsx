/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  rumBudgetInvestigatePatch,
  rumBudgetTemplateLabel,
  type RumBudgetItem,
} from '../../../../common/rum_budgets';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { deleteRumBudget } from '../../../services/rest/rum_budgets_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { useRumBudgetFlyout } from './budget_flyout_context';
import { useRumBudgets } from './use_rum_budgets';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';

const percent = (ratio: number): string => {
  if (!Number.isFinite(ratio)) {
    return '—';
  }
  return `${Math.round(ratio * 1000) / 10}%`;
};

const statusLabel = (status: RumBudgetItem['status']): string => {
  switch (status) {
    case 'HEALTHY':
      return i18n.translate('xpack.ux.budgets.status.healthyLabel', { defaultMessage: 'Healthy' });
    case 'DEGRADING':
      return i18n.translate('xpack.ux.budgets.status.degradingLabel', {
        defaultMessage: 'Burning',
      });
    case 'VIOLATED':
      return i18n.translate('xpack.ux.budgets.status.violatedLabel', {
        defaultMessage: 'Exhausted',
      });
    default:
      return i18n.translate('xpack.ux.budgets.status.noDataLabel', { defaultMessage: 'No data' });
  }
};

const statusColor = (status: RumBudgetItem['status']): string => {
  switch (status) {
    case 'HEALTHY':
      return 'success';
    case 'DEGRADING':
      return 'warning';
    case 'VIOLATED':
      return 'danger';
    default:
      return 'subdued';
  }
};

const httpErrorMessage = (err: unknown): string => {
  if (err && typeof err === 'object' && 'body' in err) {
    const body = (err as { body?: { message?: string } }).body;
    if (body?.message) {
      return body.message;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return String(err);
};

export function RumBudgetsPanel() {
  const { items, available, loading, error, reload } = useRumBudgets();
  const { http, application, notifications, slo } = useKibanaServices();
  const history = useHistory();
  const { open } = useRumBudgetFlyout();
  const [selected, setSelected] = useState<RumBudgetItem | null>(null);
  const canWrite = Boolean(application.capabilities.slo?.write);
  const canRead = Boolean(application.capabilities.slo?.read);

  const SloDetailsFlyout = slo?.getSLODetailsFlyout;

  const healthy = items.filter((item) => item.status === 'HEALTHY').length;
  const burning = items.filter(
    (item) => item.status === 'DEGRADING' || item.status === 'VIOLATED'
  ).length;

  const columns: Array<EuiBasicTableColumn<RumBudgetItem>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.ux.budgets.table.nameLabel', { defaultMessage: 'Budget' }),
        render: (_name: string, item: RumBudgetItem) => (
          <EuiLink
            data-test-subj={`uxBudgetOpen-${item.id}`}
            onClick={() => (slo ? setSelected(item) : undefined)}
          >
            {item.name}
          </EuiLink>
        ),
      },
      {
        field: 'templateId',
        name: i18n.translate('xpack.ux.budgets.table.templateLabel', {
          defaultMessage: 'Template',
        }),
        width: '160px',
        render: (templateId: RumBudgetItem['templateId']) =>
          templateId ? rumBudgetTemplateLabel(templateId) : '—',
      },
      {
        field: 'status',
        name: i18n.translate('xpack.ux.budgets.table.statusLabel', { defaultMessage: 'Status' }),
        width: '130px',
        render: (status: RumBudgetItem['status']) => (
          <EuiHealth color={statusColor(status)}>{statusLabel(status)}</EuiHealth>
        ),
      },
      {
        field: 'sliValue',
        name: i18n.translate('xpack.ux.budgets.table.sliLabel', { defaultMessage: 'SLI' }),
        width: '90px',
        render: (sliValue: number) => percent(sliValue),
      },
      {
        field: 'errorBudgetRemaining',
        name: i18n.translate('xpack.ux.budgets.table.remainingLabel', {
          defaultMessage: 'Error budget',
        }),
        width: '120px',
        render: (remaining: number) => percent(remaining),
      },
      {
        name: i18n.translate('xpack.ux.budgets.table.burnLabel', { defaultMessage: 'Burn (1h)' }),
        width: '100px',
        render: (item: RumBudgetItem) =>
          Number.isFinite(item.oneHourBurnRate) ? `${item.oneHourBurnRate.toFixed(1)}×` : '—',
      },
      {
        name: i18n.translate('xpack.ux.budgets.table.actionsLabel', { defaultMessage: 'Actions' }),
        width: '220px',
        render: (item: RumBudgetItem) => (
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                data-test-subj="uxBudgetInvestigate"
                onClick={() =>
                  pushRumPath(
                    history,
                    '/session-replay',
                    sessionsPatch(rumBudgetInvestigatePatch(item))
                  )
                }
              >
                {i18n.translate('xpack.ux.budgets.investigateButtonLabel', {
                  defaultMessage: 'Investigate',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {canWrite && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  color="danger"
                  data-test-subj="uxBudgetDelete"
                  onClick={() =>
                    void deleteRumBudget(http, item.id)
                      .then(() => reload())
                      .catch((err) =>
                        notifications.toasts.addDanger({
                          title: i18n.translate('xpack.ux.budgets.deleteErrorTitle', {
                            defaultMessage: 'Unable to delete budget',
                          }),
                          text: httpErrorMessage(err),
                        })
                      )
                  }
                >
                  {i18n.translate('xpack.ux.budgets.deleteButtonLabel', {
                    defaultMessage: 'Delete',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
    ],
    [canWrite, history, http, notifications.toasts, reload, slo]
  );

  if (loading && items.length === 0) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        style={{ minHeight: 240 }}
        data-test-subj="uxRumBudgets"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!available) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.ux.budgets.unavailableTitle', {
          defaultMessage: 'SLOs are not available',
        })}
      >
        <p>
          {i18n.translate('xpack.ux.budgets.unavailableDescription', {
            defaultMessage:
              'Performance budgets are SLO-backed. Enable the SLO plugin to create and track them.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  if (!canRead) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.ux.budgets.noReadTitle', {
          defaultMessage: 'Missing SLO privileges',
        })}
      >
        <p>
          {i18n.translate('xpack.ux.budgets.noReadDescription', {
            defaultMessage: 'You need slo_read to list performance budgets.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <div data-test-subj="uxRumBudgets">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <UxTourAnchor stepId="budgets" display="block">
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.ux.budgets.headingTitle', {
                  defaultMessage: 'Performance budgets',
                })}
              </h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.ux.budgets.headingDescription', {
                  defaultMessage:
                    'Contracts on Core Web Vitals, JS errors, and session outcomes, tracked as 30-day occurrence SLOs. Burn-rate alerts fire on sustained regression.',
                })}
              </p>
            </EuiText>
          </UxTourAnchor>
        </EuiFlexItem>
        {canWrite && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uxBudgetCreate"
              fill
              onClick={() => open({ templateId: 'lcp' })}
            >
              {i18n.translate('xpack.ux.budgets.createButtonLabel', {
                defaultMessage: 'Create budget',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer />
      {error && (
        <EuiCallOut
          announceOnMount
          color="danger"
          title={i18n.translate('xpack.ux.budgets.loadErrorTitle', {
            defaultMessage: 'Unable to load budgets',
          })}
        >
          <p>{error}</p>
          <EuiButton data-test-subj="uxBudgetRetry" color="danger" onClick={() => void reload()}>
            {i18n.translate('xpack.ux.budgets.retryButtonLabel', { defaultMessage: 'Retry' })}
          </EuiButton>
        </EuiCallOut>
      )}
      {items.length > 0 && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiStat
                  title={String(items.length)}
                  titleSize="s"
                  description={i18n.translate('xpack.ux.budgets.totalStatLabel', {
                    defaultMessage: 'Budgets',
                  })}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiStat
                  title={String(healthy)}
                  titleSize="s"
                  description={i18n.translate('xpack.ux.budgets.healthyStatLabel', {
                    defaultMessage: 'Healthy',
                  })}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder paddingSize="m">
                <EuiStat
                  title={String(burning)}
                  titleSize="s"
                  description={i18n.translate('xpack.ux.budgets.burningStatLabel', {
                    defaultMessage: 'Burning or exhausted',
                  })}
                  titleColor={burning > 0 ? 'danger' : undefined}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
        </>
      )}
      {items.length === 0 && !error ? (
        <EuiEmptyPrompt
          title={
            <h3>
              {i18n.translate('xpack.ux.budgets.emptyTitle', {
                defaultMessage: 'No performance budgets yet',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.ux.budgets.emptyDescription', {
                defaultMessage:
                  'Set a Core Web Vital, page-load, error-rate, or frustration contract — or describe one with AI. Crossing it consumes the monthly error budget.',
              })}
            </p>
          }
          actions={
            canWrite ? (
              <EuiButton
                data-test-subj="uxBudgetEmptyCreate"
                onClick={() => open({ templateId: 'lcp' })}
              >
                {i18n.translate('xpack.ux.budgets.createButtonLabel', {
                  defaultMessage: 'Create budget',
                })}
              </EuiButton>
            ) : undefined
          }
        />
      ) : (
        <EuiPanel hasBorder paddingSize="m">
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.ux.budgets.table.captionLabel', {
              defaultMessage: 'RUM performance budgets',
            })}
            items={items}
            columns={columns}
          />
        </EuiPanel>
      )}
      {selected && SloDetailsFlyout && (
        <SloDetailsFlyout
          sloId={selected.id}
          sloInstanceId={selected.instanceId}
          session="start"
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
