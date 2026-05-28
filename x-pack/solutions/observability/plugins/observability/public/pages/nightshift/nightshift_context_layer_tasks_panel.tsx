/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NightshiftContextLayerBrandIcon } from './nightshift_context_layer_brand_icon';
import { ShellSpinner } from './shell_spinner';

const ANALYSIS_DURATION_MS = 8_000;

type ContextLayerFlowPhase = 'idle' | 'analyzing' | 'complete';

interface ContextLayerTask {
  id: string;
  analyzingLabel: string;
  resultLabel: string;
}

const CONTEXT_LAYER_TASKS: ContextLayerTask[] = [
  {
    id: 'code',
    analyzingLabel: i18n.translate(
      'xpack.observability.nightshift.contextLayerTasks.codeConnect',
      { defaultMessage: 'Code connect' }
    ),
    resultLabel: i18n.translate(
      'xpack.observability.nightshift.contextLayerTasks.githubConnectionMissing',
      { defaultMessage: 'Github connection missing' }
    ),
  },
  {
    id: 'wiki',
    analyzingLabel: i18n.translate(
      'xpack.observability.nightshift.contextLayerTasks.wikiConnect',
      { defaultMessage: 'Wiki connect' }
    ),
    resultLabel: i18n.translate(
      'xpack.observability.nightshift.contextLayerTasks.confluenceConnectionMissing',
      { defaultMessage: 'Confluence connection missing' }
    ),
  },
  {
    id: 'conversations',
    analyzingLabel: i18n.translate(
      'xpack.observability.nightshift.contextLayerTasks.conversationsConnect',
      { defaultMessage: 'Conversations connect' }
    ),
    resultLabel: i18n.translate(
      'xpack.observability.nightshift.contextLayerTasks.slackConnectionsMissing',
      { defaultMessage: 'Slack connections missing' }
    ),
  },
];

export interface NightshiftContextLayerTasksPanelProps {
  isExiting?: boolean;
}

/**
 * "Context layer tasks" panel — inner Analyze → loading rows → connector results flow.
 */
export const NightshiftContextLayerTasksPanel: React.FC<NightshiftContextLayerTasksPanelProps> = ({
  isExiting = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [phase, setPhase] = useState<ContextLayerFlowPhase>('idle');
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showRows = phase === 'analyzing' || phase === 'complete';
  const isAnalyzing = phase === 'analyzing';
  const isComplete = phase === 'complete';

  useEffect(() => {
    return () => {
      if (analysisTimerRef.current !== undefined) {
        clearTimeout(analysisTimerRef.current);
      }
    };
  }, []);

  const startAnalysis = () => {
    if (phase !== 'idle' || isExiting) {
      return;
    }

    setPhase('analyzing');

    if (analysisTimerRef.current !== undefined) {
      clearTimeout(analysisTimerRef.current);
    }

    analysisTimerRef.current = setTimeout(() => {
      setPhase('complete');
      analysisTimerRef.current = undefined;
    }, ANALYSIS_DURATION_MS);
  };

  return (
    <EuiFlexItem
      grow={false}
      css={css`
        width: 100%;
      `}
      data-test-subj="nightshiftContextLayerTasks"
      data-nightshift-context-layer-phase={phase}
    >
      <EuiPanel
        paddingSize="none"
        hasShadow={false}
        hasBorder
        color="plain"
        css={css`
          overflow: hidden;
          border-radius: 12px;
          border-color: ${euiTheme.colors.borderBaseSubdued};
        `}
      >
        <div
          css={css`
            padding: ${euiTheme.size.base};
            background: ${euiTheme.colors.backgroundBasePlain};
            border-bottom: ${showRows ? euiTheme.border.thin : 'none'};
          `}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            responsive={false}
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <div
                    aria-hidden
                    css={css`
                      width: 24px;
                      height: 24px;
                      border-radius: 12px;
                      background: ${euiTheme.colors.backgroundBaseSubdued};
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                    `}
                  >
                    <EuiIcon type="plugs" size="s" color={euiTheme.colors.textSubdued} />
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>
                      {i18n.translate('xpack.observability.nightshift.contextLayerTasks.title', {
                        defaultMessage: 'Context layer tasks',
                      })}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                {!isComplete ? (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      color="text"
                      data-test-subj="nightshiftContextLayerAnalyze"
                      isDisabled={isExiting || isAnalyzing}
                      onClick={startAnalysis}
                    >
                      {i18n.translate('xpack.observability.nightshift.contextLayerTasks.analyze', {
                        defaultMessage: 'Analyze',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="boxesHorizontal"
                    color="text"
                    size="s"
                    aria-label={i18n.translate(
                      'xpack.observability.nightshift.contextLayerTasks.moreAriaLabel',
                      { defaultMessage: 'More actions for context layer tasks' }
                    )}
                    isDisabled={isExiting}
                    onClick={() => {}}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        {showRows
          ? CONTEXT_LAYER_TASKS.map((task, idx) => {
              const isLast = idx === CONTEXT_LAYER_TASKS.length - 1;
              const rowLabel = isComplete ? task.resultLabel : task.analyzingLabel;

              return (
                <div
                  key={task.id}
                  css={css`
                    padding: ${euiTheme.size.s} ${euiTheme.size.base};
                    background: ${euiTheme.colors.backgroundBaseSubdued};
                    border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
                  `}
                  data-test-subj={`nightshiftContextLayerTask-${task.id}`}
                >
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="spaceBetween"
                    responsive={false}
                    gutterSize="s"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                        <EuiFlexItem grow={false}>
                          {isComplete ? (
                            <NightshiftContextLayerBrandIcon taskId={task.id} />
                          ) : (
                            <ShellSpinner
                              size={12}
                              aria-label={i18n.translate(
                                'xpack.observability.nightshift.contextLayerTasks.analyzingRowAriaLabel',
                                {
                                  defaultMessage: 'Analyzing {task}',
                                  values: { task: task.analyzingLabel },
                                }
                              )}
                            />
                          )}
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="xs">
                            <strong>{rowLabel}</strong>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    {isComplete ? (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="xs"
                          color="text"
                          data-test-subj={`nightshiftContextLayerTask-${task.id}-connect`}
                          isDisabled={isExiting}
                          onClick={() => {}}
                        >
                          {i18n.translate(
                            'xpack.observability.nightshift.contextLayerTasks.connect',
                            { defaultMessage: 'Connect' }
                          )}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </div>
              );
            })
          : null}
      </EuiPanel>
    </EuiFlexItem>
  );
};
