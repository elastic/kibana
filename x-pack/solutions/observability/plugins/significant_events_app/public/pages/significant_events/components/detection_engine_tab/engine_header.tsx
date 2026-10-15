/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  EuiHorizontalRule,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EngineOverviewResponse } from '@kbn/significant-events-plugin/common';
import React, { useState } from 'react';
import { useGenAIConnectors } from '../../../../hooks/use_genai_connectors';
import { useKibana } from '../../../../hooks/use_kibana';
import type { IDetectionEngineActions } from '../../../../hooks/use_detection_engine_actions';
import { formatUsd } from './format';
import { useNow } from './use_now';

const HEURISTIC_VALUE = '__heuristic__';
const REPLAY_MINUTES = 60;
/** The schedule runs every minute; this long without a run means it has stalled. */
const STALLED_AFTER_MS = 3 * 60_000;
const SCHEDULE_MS = 60_000;
const WORKFLOWS_APP_ID = 'workflows';

interface IEngineHeaderProps {
  overview: EngineOverviewResponse;
  actions: IDetectionEngineActions;
}

/** Title, run controls, and the engine settings kept out of the way in a popover. */
export function EngineHeader({ overview, actions }: IEngineHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const resetTitleId = useGeneratedHtmlId();
  const now = useNow(1_000);
  const { connectors, loading: connectorsLoading } = useGenAIConnectors();
  const {
    core: { application },
  } = useKibana();
  const { config, cost, auto_run: autoRun, last_run: lastRun } = overview;

  const agentValue =
    config.agent.kind === 'llm' && config.agent.connector_id
      ? config.agent.connector_id
      : HEURISTIC_VALUE;
  const lastEnd = overview.last_evaluated_bucket_end;
  // Since the last run that evaluated anything, or since auto-run was turned on.
  const lastActivity = Math.max(
    lastRun ? Date.parse(lastRun.finished_at) : 0,
    autoRun.changed_at ? Date.parse(autoRun.changed_at) : 0
  );
  const secondsToNext = Math.max(0, Math.ceil((lastActivity + SCHEDULE_MS - now) / 1000));
  const isStalled = autoRun.enabled && now - lastActivity > STALLED_AFTER_MS;
  const workflowHref = autoRun.workflow_id
    ? application.getUrlForApp(WORKFLOWS_APP_ID, { path: `/${autoRun.workflow_id}` })
    : undefined;

  const status = autoRun.error
    ? autoRun.error
    : autoRun.enabled
    ? isStalled
      ? i18n.translate('xpack.significantEventsApp.detectionEngine.header.stalled', {
          defaultMessage: 'Auto-run is on, but nothing ran for {minutes} min. Check its workflow.',
          values: { minutes: Math.round((now - lastActivity) / 60_000) },
        })
      : secondsToNext > 0
      ? i18n.translate('xpack.significantEventsApp.detectionEngine.header.nextCheck', {
          defaultMessage: 'Running on the server · next check in about {seconds}s',
          values: { seconds: secondsToNext },
        })
      : i18n.translate('xpack.significantEventsApp.detectionEngine.header.checking', {
          defaultMessage: 'Running on the server · checking the latest minute',
        })
    : lastEnd
    ? i18n.translate('xpack.significantEventsApp.detectionEngine.header.paused', {
        defaultMessage: 'Auto-run off · last checked the minute ending {time}',
        values: { time: new Date(lastEnd).toLocaleTimeString() },
      })
    : i18n.translate('xpack.significantEventsApp.detectionEngine.header.notStarted', {
        defaultMessage: 'Not started',
      });
  const statusColor = autoRun.error
    ? 'danger'
    : autoRun.enabled
    ? isStalled
      ? 'warning'
      : 'success'
    : 'subdued';

  return (
    <div data-test-subj="detectionEngineHeader">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.title', {
                defaultMessage: 'Detection engine',
              })}{' '}
              <EuiBetaBadge
                label={i18n.translate('xpack.significantEventsApp.detectionEngine.prototypeBadge', {
                  defaultMessage: 'Prototype',
                })}
                tooltipContent={i18n.translate(
                  'xpack.significantEventsApp.detectionEngine.prototypeTooltip',
                  {
                    defaultMessage:
                      'A working playground of the new detection engine architecture. It runs next to the current pipeline and does not change it.',
                  }
                )}
                size="s"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiHealth color={statusColor} data-test-subj="detectionEngineStatus">
                {status}
              </EuiHealth>
            </EuiFlexItem>
            {autoRun.enabled && workflowHref && (
              <EuiFlexItem grow={false}>
                <EuiLink
                  href={workflowHref}
                  target="_blank"
                  data-test-subj="detectionEngineWorkflowLink"
                >
                  {i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.header.workflowLink',
                    {
                      defaultMessage: 'View schedule',
                    }
                  )}
                </EuiLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.significantEventsApp.detectionEngine.autoRunTooltip', {
              defaultMessage:
                'Runs the engine every minute as a workflow in this space. It keeps going when you leave this page or close the browser, until you turn it off.',
            })}
          >
            <EuiSwitch
              data-test-subj="detectionEngineAutoRunSwitch"
              label={i18n.translate('xpack.significantEventsApp.detectionEngine.autoRun', {
                defaultMessage: 'Auto-run',
              })}
              checked={autoRun.enabled}
              disabled={actions.pendingAction === 'autoRun'}
              onChange={(event) => actions.setAutoRun(event.target.checked)}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="play"
            size="s"
            data-test-subj="detectionEngineRunButton"
            isLoading={actions.pendingAction === 'run'}
            onClick={() => actions.runEngine()}
          >
            {i18n.translate('xpack.significantEventsApp.detectionEngine.runNow', {
              defaultMessage: 'Run now',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.translate(
              'xpack.significantEventsApp.detectionEngine.settings.ariaLabel',
              { defaultMessage: 'Engine settings' }
            )}
            isOpen={isSettingsOpen}
            closePopover={() => setIsSettingsOpen(false)}
            anchorPosition="downRight"
            button={
              <EuiToolTip
                content={i18n.translate(
                  'xpack.significantEventsApp.detectionEngine.settings.open',
                  { defaultMessage: 'Open engine settings' }
                )}
              >
                <EuiButtonIcon
                  display="base"
                  size="s"
                  iconType="gear"
                  data-test-subj="detectionEngineSettingsButton"
                  aria-label={i18n.translate(
                    'xpack.significantEventsApp.detectionEngine.settings.openAria',
                    { defaultMessage: 'Open engine settings' }
                  )}
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                />
              </EuiToolTip>
            }
          >
            <EuiPopoverTitle>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.settings.title', {
                defaultMessage: 'Engine settings',
              })}
            </EuiPopoverTitle>
            <div style={{ width: 340 }}>
              <EuiFormRow
                label={i18n.translate('xpack.significantEventsApp.detectionEngine.agentLabel', {
                  defaultMessage: 'Discovery agent',
                })}
                helpText={
                  cost.current_price
                    ? i18n.translate('xpack.significantEventsApp.detectionEngine.agentPrice', {
                        defaultMessage:
                          '{model}: {input} input, {output} output per million tokens (Elastic Inference Service list price).',
                        values: {
                          model: cost.current_price.model,
                          input: formatUsd(cost.current_price.input),
                          output: formatUsd(cost.current_price.output),
                        },
                      })
                    : config.agent.kind === 'llm'
                    ? i18n.translate('xpack.significantEventsApp.detectionEngine.agentNoPrice', {
                        defaultMessage:
                          'No list price is known for this model; its tokens are counted but not priced.',
                      })
                    : i18n.translate('xpack.significantEventsApp.detectionEngine.agentHeuristic', {
                        defaultMessage:
                          'Rules in code answer in the same shape as a model, with no cost. Pick a model to see it reason.',
                      })
                }
              >
                <EuiSelect
                  data-test-subj="detectionEngineAgentSelect"
                  isLoading={connectorsLoading}
                  value={agentValue}
                  options={[
                    {
                      value: HEURISTIC_VALUE,
                      text: i18n.translate(
                        'xpack.significantEventsApp.detectionEngine.heuristicAgent',
                        { defaultMessage: 'Heuristic (no model, no cost)' }
                      ),
                    },
                    ...(connectors ?? []).map((connector) => ({
                      value: connector.connectorId,
                      text: connector.name,
                    })),
                  ]}
                  onChange={(event) =>
                    actions.updateConfig({
                      agent:
                        event.target.value === HEURISTIC_VALUE
                          ? { kind: 'heuristic' }
                          : { kind: 'llm', connector_id: event.target.value },
                    })
                  }
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiSwitch
                data-test-subj="detectionEnginePublishSwitch"
                label={i18n.translate('xpack.significantEventsApp.detectionEngine.publishSwitch', {
                  defaultMessage: 'Publish events as Alerting v2 alerts',
                })}
                checked={config.publish_to_alerting_v2}
                onChange={(event) =>
                  actions.updateConfig({ publish_to_alerting_v2: event.target.checked })
                }
              />
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.significantEventsApp.detectionEngine.publishHelp', {
                  defaultMessage:
                    'Published events also appear in the Significant events tab and fire its workflow triggers.',
                })}
              </EuiText>
              <EuiHorizontalRule margin="m" />
              <EuiButton
                size="s"
                iconType="timeRefresh"
                fullWidth
                data-test-subj="detectionEngineReplayButton"
                isLoading={actions.pendingAction === 'replay'}
                onClick={() => actions.replay(REPLAY_MINUTES)}
              >
                {i18n.translate('xpack.significantEventsApp.detectionEngine.replay', {
                  defaultMessage: 'Replay last {minutes} minutes',
                  values: { minutes: REPLAY_MINUTES },
                })}
              </EuiButton>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.significantEventsApp.detectionEngine.replayHelp', {
                  defaultMessage:
                    'Runs every strategy over past data to build baselines and show what each would have raised. Raises nothing.',
                })}
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButtonEmpty
                size="s"
                color="danger"
                iconType="trash"
                flush="left"
                data-test-subj="detectionEngineLabResetButton"
                isLoading={actions.pendingAction === 'labReset'}
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsResetOpen(true);
                }}
              >
                {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.reset', {
                  defaultMessage: 'Reset lab and engine data',
                })}
              </EuiButtonEmpty>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.significantEventsApp.detectionEngine.description', {
            defaultMessage:
              'Several detection strategies watch the system and report what looks off in one shape. Code decides what it can compute; one AI step checks the evidence and explains. The result is a few well-explained significant events.',
          })}
        </p>
      </EuiText>
      {isResetOpen && (
        <EuiConfirmModal
          aria-labelledby={resetTitleId}
          titleProps={{ id: resetTitleId }}
          title={i18n.translate('xpack.significantEventsApp.detectionEngine.lab.resetTitle', {
            defaultMessage: 'Reset the lab?',
          })}
          onCancel={() => setIsResetOpen(false)}
          onConfirm={() => {
            setIsResetOpen(false);
            actions.resetLab();
          }}
          cancelButtonText={i18n.translate(
            'xpack.significantEventsApp.detectionEngine.lab.resetCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.significantEventsApp.detectionEngine.lab.resetConfirm',
            { defaultMessage: 'Reset' }
          )}
          buttonColor="danger"
        >
          {i18n.translate('xpack.significantEventsApp.detectionEngine.lab.resetBody', {
            defaultMessage:
              'Deletes the lab logs and every detection engine document in this space: observations, detections, events, activity, settings and the cost counter. The lab source and its KIs stay, and events already published to Alerting v2 stay there.',
          })}
        </EuiConfirmModal>
      )}
    </div>
  );
}
