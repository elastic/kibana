/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  euiContainerQuery,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { rollingTimeWindowTypeSchema } from '@kbn/slo-schema';
import React, { useState } from 'react';
import numeral from '@elastic/numeral';
import { css } from '@emotion/react';
import { toDurationAdverbLabel, toDurationLabel } from '../../../../../utils/slo/labels';
import { useErrorBudgetChart } from './hooks/use_error_budget_chart';
import { SloFlyoutPanel } from '../../../shared_flyout/flyout_panel';
import { WideChart } from '../../wide_chart';
import { getSloChartState } from '../../../utils/is_slo_failed';
import { ErrorBudgetActions } from './error_budget_actions';
import type { ErrorBudgetChartPanelProps } from './types';
import { CHART_PANEL_WIDTH_BREAKPOINT } from '../../../shared_flyout/constants';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

interface Props extends ErrorBudgetChartPanelProps {
  handleAttachToDashboardSave: SaveModalDashboardProps['onSave'];
}

export function ErrorBudgetChartFlyoutPanel({
  data,
  isLoading,
  slo,
  handleAttachToDashboardSave,
  onBrushed,
  hideHeaderDurationLabel = false,
}: Props) {
  const {
    isSloFailed,
    lastErrorBudgetRemaining,
    errorBudgetTimeRemainingFormatted,
    percentFormat,
    isDashboardContext,
  } = useErrorBudgetChart({ slo, data });

  const [isDashboardAttachmentReady, setDashboardAttachmentReady] = useState(false);

  return (
    <>
      <EuiFlexItem>
        <SloFlyoutPanel
          title={i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.title', {
            defaultMessage: 'Error budget burn down',
          })}
          renderTooltip
          data-test-subj="errorBudgetChartPanel"
          append={
            !isDashboardContext && (
              <EuiFlexItem grow={false}>
                <ErrorBudgetActions setDashboardAttachmentReady={setDashboardAttachmentReady} />
              </EuiFlexItem>
            )
          }
        >
          <EuiFlexGroup
            direction="row"
            gutterSize="m"
            css={css`
              ${euiContainerQuery(`(width <= ${CHART_PANEL_WIDTH_BREAKPOINT}px)`)} {
                flex-direction: column-reverse;
              }
            `}
          >
            <EuiFlexItem grow={1}>
              <EuiPanel hasShadow={false} paddingSize="m" color="plain" hasBorder>
                <EuiFlexGroup
                  direction="column"
                  css={css`
                    ${euiContainerQuery(`(width <= ${CHART_PANEL_WIDTH_BREAKPOINT}px)`)} {
                      flex-direction: row;
                    }
                  `}
                >
                  {!hideHeaderDurationLabel && (
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xxs">
                        <h5>
                          {rollingTimeWindowTypeSchema.is(slo.timeWindow.type)
                            ? i18n.translate(
                                'xpack.slo.sloDetails.errorBudgetChartPanel.duration',
                                {
                                  defaultMessage: 'Last {duration}',
                                  values: { duration: toDurationLabel(slo.timeWindow.duration) },
                                }
                              )
                            : toDurationAdverbLabel(slo.timeWindow.duration)}
                        </h5>
                      </EuiTitle>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiStat
                      titleColor={isSloFailed ? 'danger' : 'success'}
                      title={
                        lastErrorBudgetRemaining
                          ? numeral(lastErrorBudgetRemaining).format(percentFormat)
                          : '-'
                      }
                      titleSize="s"
                      description={i18n.translate(
                        'xpack.slo.sloDetails.errorBudgetChartPanel.remaining',
                        {
                          defaultMessage: 'Remaining',
                        }
                      )}
                      reverse
                    />
                  </EuiFlexItem>
                  {errorBudgetTimeRemainingFormatted ? (
                    <EuiFlexItem grow={false}>
                      <EuiStat
                        titleColor={isSloFailed ? 'danger' : 'success'}
                        title={errorBudgetTimeRemainingFormatted}
                        titleSize="s"
                        description={i18n.translate(
                          'xpack.slo.sloDetails.errorBudgetChartPanel.remaining',
                          {
                            defaultMessage: 'Remaining',
                          }
                        )}
                        reverse
                      />
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem grow={3}>
              <WideChart
                chart="area"
                id={i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.chartTitle', {
                  defaultMessage: 'Error budget remaining',
                })}
                state={getSloChartState(slo.summary.status)}
                data={data}
                isLoading={isLoading}
                onBrushed={onBrushed}
                slo={slo}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </SloFlyoutPanel>
      </EuiFlexItem>
      {isDashboardAttachmentReady ? (
        <SavedObjectSaveModalDashboard
          objectType={i18n.translate(
            'xpack.slo.errorBudgetBurnDown.actions.attachToDashboard.objectTypeLabel',
            { defaultMessage: 'SLO Error Budget burn down' }
          )}
          documentInfo={{
            title: i18n.translate(
              'xpack.slo.errorBudgetBurnDown.actions.attachToDashboard.attachmentTitle',
              { defaultMessage: 'SLO Error Budget burn down' }
            ),
          }}
          canSaveByReference={false}
          onClose={() => {
            setDashboardAttachmentReady(false);
          }}
          onSave={handleAttachToDashboardSave}
        />
      ) : null}
    </>
  );
}
