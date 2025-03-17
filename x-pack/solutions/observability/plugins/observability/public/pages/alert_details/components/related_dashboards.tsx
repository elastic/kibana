/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { set } from '@kbn/safer-lodash-set';
import { omit } from 'lodash';
import { css } from '@emotion/react';
import { v4 as uuidv4 } from 'uuid';
import { ALERT_START, ALERT_END } from '@kbn/rule-data-utils';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { TypedLensAttributes, XYState } from '@kbn/lens-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/common/constants';
import { i18n } from '@kbn/i18n';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import {
  EuiButton,
  EuiCheckbox,
  EuiBadge,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlexGrid,
} from '@elastic/eui';
import { GetRecommendedDashboardsResponse } from '@kbn/observability-schema';
import { TimeRange } from '@kbn/es-query';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { useKibana } from '../../../utils/kibana_react';
import { TopAlert } from '../../..';

interface RelatedDashboardsProps {
  alert: TopAlert;
  recommendedDashboards: GetRecommendedDashboardsResponse['dashboards'];
}

const DASHBOARD_STATE_SESSION_KEY = 'dashboardStateManagerPanels';
const DASHBOARD_PANELS_SESSION_KEY = 'dashboardPanels';

export function RelatedDashboards({ alert, recommendedDashboards }: RelatedDashboardsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });
  const [isFormMode, setIsFormMode] = useState(false);
  const [adHocPanelState, setAdHocPanelState] = useState<Record<string, unknown>>({});
  const alertStart = alert.fields[ALERT_START];
  const alertEnd = alert.fields[ALERT_END];
  const {
    services: {
      lens: { EmbeddableComponent },
      share: { url: urlService },
    },
  } = useKibana();

  useEffect(() => {
    const panels = getAllPanelsFromRelatedDashboards(recommendedDashboards);
    const panelState = panels.reduce((acc, panel) => {
      return {
        ...acc,
        [panel.panelIndex]: {
          ...panel.input,
          attributes: addAnnotationLayertoLensAttributes({
            attributes: panel.input.attributes,
            alertStart,
            alertEnd: alertEnd ?? undefined,
          }),
        },
      };
    }, {});
    setAdHocPanelState(panelState);
  }, [alertStart, alertEnd, recommendedDashboards]);

  const onSubmit = useCallback(() => {
    const dashboardSessionStorage = new Storage(sessionStorage);

    const copiedPanelState = Object.values(adHocPanelState).reduce((acc, panel) => {
      return {
        ...acc,
        [uuidv4()]: {
          ...panel,
        },
      };
    }, {});
    let currentX = 0;
    let currentY = 0;
    const copiedDashboardState = {
      panels: Object.entries(copiedPanelState).reduce((acc, [key, value]) => {
        const panel = {
          ...acc,
          [key]: {
            type: LENS_EMBEDDABLE_TYPE,
            explicitInput: value,
            gridData: {
              i: key,
              x: currentX,
              y: currentY,
              w: 24,
              h: 15,
            },
          },
        };
        if (Object.keys(panel).length % 2 === 0) {
          currentX = 0;
          currentY += 15;
        } else {
          currentX += 24;
        }
        return panel;
      }, {}),
    };
    const panelsStateStorage = dashboardSessionStorage.get(DASHBOARD_PANELS_SESSION_KEY) ?? {};
    set(panelsStateStorage, ['default', 'unsavedDashboard'], copiedPanelState); // TODO: handle spaces
    dashboardSessionStorage.set(DASHBOARD_PANELS_SESSION_KEY, panelsStateStorage);

    const dashboardStateStorage = dashboardSessionStorage.get(DASHBOARD_STATE_SESSION_KEY) ?? {};
    set(dashboardStateStorage, ['default', 'unsavedDashboard'], copiedDashboardState); // TODO: handle spaces
    dashboardSessionStorage.set(DASHBOARD_STATE_SESSION_KEY, dashboardStateStorage);

    const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
    dashboardLocator?.navigate({ timeRange });
  }, [urlService.locators, timeRange, adHocPanelState]);

  useEffect(() => {
    setTimeRange(getPaddedAlertTimeRange(alertStart!, alertEnd));
  }, [alertStart, alertEnd]);

  const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
  return (
    <div>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="m">
            <h2>
              {i18n.translate('xpack.observability.recommendedDashboards.title', {
                defaultMessage: 'Recommended Dashboards',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="createnewdashboardfromalerts"
            onClick={isFormMode ? onSubmit : () => setIsFormMode(true)}
          >
            {isFormMode
              ? i18n.translate('xpack.observability.recommendedDashboards.submit', {
                  defaultMessage: 'Select panels and go to dashboard',
                })
              : i18n.translate('xpack.observability.recommendedDashboards.create', {
                  defaultMessage: 'Create new dashboard',
                })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column">
        {recommendedDashboards.map((dashboard) => (
          <EuiFlexItem key={dashboard.id}>
            <EuiTitle size="s">
              <h3>{dashboard.title}</h3>
            </EuiTitle>
            <EuiFlexGroup alignItems="flexEnd">
              <EuiFlexItem>
                <div>
                  <EuiText color="subdued">
                    {i18n.translate('xpack.observability.recommendedDashboards.matchedBy', {
                      defaultMessage: 'Matched by',
                    })}
                  </EuiText>
                </div>
                <EuiSpacer size="xs" />
                <div>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false} alignItems="center">
                      <EuiText size="s" color="subdued">
                        {i18n.translate('xpack.observability.recommendedDashboards.fieldsLabel', {
                          defaultMessage: 'Fields',
                        })}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {dashboard.matchedBy.fields && (
                        <EuiFlexGroup gutterSize="xs">
                          {dashboard.matchedBy.fields.map((field) => (
                            <EuiFlexItem grow={false}>
                              <EuiBadge>{field}</EuiBadge>
                            </EuiFlexItem>
                          ))}
                        </EuiFlexGroup>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  href={dashboardLocator?.getRedirectUrl({
                    dashboardId: dashboard.id,
                    timeRange,
                  })}
                  target="_blank"
                  data-test-subj="linkedDashboard"
                >
                  {i18n.translate('xpack.observability.recommendedDashboards.navigate', {
                    defaultMessage: 'Navigate to dashboard',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGrid columns={2}>
              {dashboard.relevantPanels.map((panel) => {
                return (
                  <EuiFlexItem>
                    <div
                      css={css`
                        min-height: 200px;
                      `}
                    >
                      <EuiFlexGroup>
                        {isFormMode && (
                          <EuiFlexItem grow={false}>
                            <EuiSpacer size="l" />
                            <EuiCheckbox
                              id={`select${panel.panel.panelIndex}`}
                              aria-label={`Select ${panel.panel.panelIndex}`}
                              onChange={() => {
                                const updatedPanels = omit(adHocPanelState, panel.panel.panelIndex);
                                setAdHocPanelState(updatedPanels);
                              }}
                              checked={Boolean(adHocPanelState[panel.panel.panelIndex])}
                            />
                          </EuiFlexItem>
                        )}
                        <EuiFlexItem>
                          <EmbeddableComponent
                            key={panel.panel.panelIndex}
                            style={{ height: 200 }}
                            attributes={addAnnotationLayertoLensAttributes({
                              attributes: panel.panel.embeddableConfig.attributes,
                              alertStart,
                              alertEnd: alertEnd ?? undefined,
                            })}
                            timeRange={timeRange}
                            renderMode="view"
                            disableTriggers
                            syncTooltips={false}
                            syncCursor={false}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </div>
                    <EuiFlexGroup gutterSize="xs" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {i18n.translate(
                            'xpack.observability.recommendedDashboards.matchesLabel',
                            {
                              defaultMessage: 'Matches',
                            }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                      {panel.matchedBy.fields.map((field) => (
                        <EuiFlexItem grow={false}>
                          <EuiBadge>{field}</EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGrid>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
}

function getAllPanelsFromRelatedDashboards(
  dashboards: GetRecommendedDashboardsResponse['dashboards']
): Array<EmbeddablePackageState & { panelIndex: string }> {
  return dashboards.reduce((panels, dashboard) => {
    return [
      ...panels,
      ...dashboard.relevantPanels.map((panel) => ({
        type: panel.panel.type,
        input: panel.panel.embeddableConfig,
        panelIndex: panel.panel.panelIndex,
      })),
    ];
  }, [] as Array<EmbeddablePackageState & { panelIndex: string }>);
}

function createAlertAnnotations({
  alertStart,
  alertEnd,
}: {
  alertStart: string;
  alertEnd?: string;
}) {
  return {
    layerId: uuidv4(),
    layerType: 'annotations',
    annotations: [
      {
        label: 'Alert Start',
        type: 'manual',
        key: {
          type: 'point_in_time',
          timestamp: alertStart,
        },
        isHidden: false,
        textVisibility: true,
        icon: 'alert',
        id: uuidv4(),
      },
      ...(alertEnd
        ? [
            {
              color: '#16c5c0', // TODO: use EUI color
              label: 'Alert End',
              type: 'manual',
              isHidden: false,
              key: {
                type: 'point_in_time',
                timestamp: alertEnd,
              },
              icon: 'triangle',
              textVisibility: true,
              id: uuidv4(),
            },
          ]
        : []),
    ],
    ignoreGlobalFilters: true,
    persistanceType: 'byValue',
  };
}

function addAnnotationLayertoLensAttributes({
  attributes,
  alertStart,
  alertEnd,
}: {
  attributes: LensAttributes;
  alertStart: string;
  alertEnd: string;
}) {
  if (attributes.visualizationType === 'lnsXY') {
    const xyAttributes = attributes as TypedLensAttributes<'lnsXY', XYState>;
    return {
      ...xyAttributes,
      state: {
        ...xyAttributes.state,
        visualization: {
          ...xyAttributes.state.visualization,
          layers: [
            ...xyAttributes.state.visualization.layers,
            createAlertAnnotations({ alertStart, alertEnd }),
          ],
        },
      },
    };
  }
  return attributes;
}
