/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiAvatar,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  isChatCompletionChunkEvent,
  isChatCompletionMessageEvent,
  MessageRole,
  type InferenceConnector,
} from '@kbn/inference-common';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { RumReportResponse } from '../../../../common/rum_report';
import {
  defaultReportInstructions,
  reportAnalystFollowUp,
  reportToPromptContext,
  RUM_LLM_SYSTEM_PROMPT,
} from '../../../../common/rum_llm';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { pushRumAiFollowUp } from '../../../utils/rum_search';

export function AiReportPanel({
  report,
  expanded,
}: {
  report: RumReportResponse;
  expanded: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { inference, uiSettings, notifications, application, agentBuilder } = useKibanaServices();
  const [connectors, setConnectors] = useState<InferenceConnector[]>([]);
  const [connectorId, setConnectorId] = useState<string>('');
  const [instructions, setInstructions] = useState(() =>
    defaultReportInstructions(report.templateId)
  );
  const [narrative, setNarrative] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const narrativeRef = useRef('');

  const canOpenAnalyst = Boolean(
    agentBuilder && (application.capabilities.agentBuilder as { show?: boolean } | undefined)?.show
  );

  useEffect(() => {
    setInstructions(defaultReportInstructions(report.templateId));
    setNarrative('');
    narrativeRef.current = '';
    setError(null);
  }, [report.templateId, report.generatedAt]);

  useEffect(() => {
    let cancelled = false;
    void inference.getConnectors().then((list) => {
      if (cancelled) {
        return;
      }
      const usable = list.filter((connector) => !connector.isMissingSecrets);
      setConnectors(usable);
      const settingsDefault = uiSettings.get<string | undefined>(
        GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
      );
      const preferred =
        usable.find((connector) => connector.connectorId === settingsDefault) ?? usable[0];
      if (preferred) {
        setConnectorId((current) => current || preferred.connectorId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [inference, uiSettings]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      subscriptionRef.current?.unsubscribe();
    };
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    subscriptionRef.current?.unsubscribe();
    abortRef.current = null;
    subscriptionRef.current = null;
    setStreaming(false);
  }, []);

  const generate = useCallback(() => {
    if (!connectorId) {
      setError(
        i18n.translate('xpack.ux.reports.ai.noConnectorErrorMessage', {
          defaultMessage: 'Select a GenAI connector first.',
        })
      );
      return;
    }
    stop();
    setError(null);
    setNarrative('');
    narrativeRef.current = '';
    setStreaming(true);
    const abort = new AbortController();
    abortRef.current = abort;
    const userContent = [
      instructions.trim(),
      '',
      'Report data:',
      reportToPromptContext(report),
    ].join('\n');
    try {
      const events$ = inference.chatComplete({
        connectorId,
        system: RUM_LLM_SYSTEM_PROMPT,
        messages: [{ role: MessageRole.User, content: userContent }],
        stream: true,
        abortSignal: abort.signal,
      });
      subscriptionRef.current = events$.subscribe({
        next: (event) => {
          if (isChatCompletionChunkEvent(event) && event.content) {
            narrativeRef.current += event.content;
            setNarrative(narrativeRef.current);
            return;
          }
          if (isChatCompletionMessageEvent(event) && event.content) {
            narrativeRef.current = event.content;
            setNarrative(event.content);
          }
        },
        error: (err) => {
          setStreaming(false);
          if (abort.signal.aborted) {
            return;
          }
          setError(err instanceof Error ? err.message : String(err));
        },
        complete: () => {
          setStreaming(false);
          if (!narrativeRef.current) {
            setError(
              i18n.translate('xpack.ux.reports.ai.emptyNarrativeErrorMessage', {
                defaultMessage: 'The model returned no text. Try again or pick another connector.',
              })
            );
          }
        },
      });
    } catch (err) {
      setStreaming(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [connectorId, inference, instructions, report, stop]);

  const copyNarrative = async () => {
    await navigator.clipboard.writeText(narrative);
    notifications.toasts.addSuccess(
      i18n.translate('xpack.ux.reports.ai.copiedNarrativeTitle', {
        defaultMessage: 'Copied AI narrative',
      })
    );
  };

  const openAnalyst = () => {
    pushRumAiFollowUp(history, reportAnalystFollowUp(report, narrative));
  };

  const connectorOptions = useMemo(
    () =>
      connectors.map((connector) => ({
        value: connector.connectorId,
        text: connector.name,
      })),
    [connectors]
  );

  const selectedConnectorName = connectors.find(
    (connector) => connector.connectorId === connectorId
  )?.name;

  const headerCss = css`
    padding: ${euiTheme.size.m} ${euiTheme.size.l};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
  `;

  const bodyCss = css`
    padding: ${euiTheme.size.m} ${euiTheme.size.l};
  `;

  const articleCss = css`
    margin: 0 ${euiTheme.size.l} ${euiTheme.size.l};
    padding: ${euiTheme.size.l} ${euiTheme.size.xl};
    max-width: 48rem;
    background: ${euiTheme.colors.backgroundBasePlain};
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    border-left: ${euiTheme.size.xs} solid ${euiTheme.colors.primary};
    border-radius: ${euiTheme.border.radius.medium};

    .euiMarkdownFormat > *:first-child {
      margin-top: 0;
    }
  `;

  if (!expanded && !narrative) {
    return null;
  }

  const instructionsForm = (
    <>
      {connectorOptions.length > 1 && (
        <EuiFormRow
          label={i18n.translate('xpack.ux.reports.ai.connectorLabel', {
            defaultMessage: 'Connector',
          })}
        >
          <EuiSelect
            data-test-subj="uxReportAiConnector"
            options={connectorOptions}
            value={connectorId}
            onChange={(event) => setConnectorId(event.target.value)}
            compressed
          />
        </EuiFormRow>
      )}
      <EuiFormRow
        label={i18n.translate('xpack.ux.reports.ai.instructionsLabel', {
          defaultMessage: 'Instructions',
        })}
      >
        <EuiTextArea
          data-test-subj="uxReportAiInstructions"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          rows={3}
        />
      </EuiFormRow>
    </>
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiPanel
        hasBorder
        paddingSize="none"
        data-test-subj="uxReportAiPanel"
        className={!narrative ? 'uxRumReportNoPrint' : undefined}
      >
        <div className="uxRumReportNoPrint" css={headerCss}>
          <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={true}>
              <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiAvatar
                    name={i18n.translate('xpack.ux.reports.ai.avatarLabel', {
                      defaultMessage: 'AI',
                    })}
                    iconType="sparkles"
                    color="subdued"
                    size="m"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <EuiTitle size="xs">
                    <h3>
                      {i18n.translate('xpack.ux.reports.ai.panelTitle', {
                        defaultMessage: 'AI narrative',
                      })}
                    </h3>
                  </EuiTitle>
                  <EuiText size="xs" color="subdued">
                    {selectedConnectorName
                      ? i18n.translate(
                          'xpack.ux.reports.ai.panelSubtitleWithConnectorDescription',
                          {
                            defaultMessage: '{report} · {connector}',
                            values: { report: report.title, connector: selectedConnectorName },
                          }
                        )
                      : report.title}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                {streaming && (
                  <EuiBadge color="hollow">
                    {i18n.translate('xpack.ux.reports.ai.writingBadgeLabel', {
                      defaultMessage: 'Writing…',
                    })}
                  </EuiBadge>
                )}
                {canOpenAnalyst && !narrative && (
                  <EuiButtonEmpty
                    data-test-subj="uxReportAiOpenAnalyst"
                    iconType="sparkles"
                    size="s"
                    onClick={openAnalyst}
                  >
                    {i18n.translate('xpack.ux.reports.ai.openAnalystButtonLabel', {
                      defaultMessage: 'Open in AI Analyst',
                    })}
                  </EuiButtonEmpty>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div className="uxRumReportNoPrint" css={bodyCss}>
          {connectors.length === 0 ? (
            <EuiCallOut
              announceOnMount
              color="warning"
              title={i18n.translate('xpack.ux.reports.ai.missingConnectorTitle', {
                defaultMessage: 'No GenAI connector',
              })}
            >
              <p>
                {i18n.translate('xpack.ux.reports.ai.missingConnectorDescription', {
                  defaultMessage:
                    'Configure a pre-configured or default GenAI connector, then generate a narrative from this report.',
                })}
              </p>
              <EuiButtonEmpty
                data-test-subj="uxReportAiOpenConnectors"
                onClick={() =>
                  application.navigateToApp('management', {
                    path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
                  })
                }
              >
                {i18n.translate('xpack.ux.reports.ai.openConnectorsLinkText', {
                  defaultMessage: 'Open connectors',
                })}
              </EuiButtonEmpty>
            </EuiCallOut>
          ) : (
            <>
              {narrative ? (
                <EuiAccordion
                  id="uxReportAiInstructions"
                  buttonContent={i18n.translate('xpack.ux.reports.ai.editInstructionsButtonLabel', {
                    defaultMessage: 'Edit instructions',
                  })}
                  paddingSize="s"
                >
                  {instructionsForm}
                </EuiAccordion>
              ) : (
                instructionsForm
              )}
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="uxReportAiGenerate"
                    fill
                    iconType="sparkles"
                    isLoading={streaming}
                    onClick={() => generate()}
                  >
                    {narrative
                      ? i18n.translate('xpack.ux.reports.ai.regenerateButtonLabel', {
                          defaultMessage: 'Regenerate',
                        })
                      : i18n.translate('xpack.ux.reports.ai.generateButtonLabel', {
                          defaultMessage: 'Generate',
                        })}
                  </EuiButton>
                </EuiFlexItem>
                {streaming && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty data-test-subj="uxReportAiStop" onClick={stop}>
                      {i18n.translate('xpack.ux.reports.ai.stopButtonLabel', {
                        defaultMessage: 'Stop',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
                {narrative && !streaming && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="uxReportAiCopy"
                      iconType="copy"
                      onClick={() => void copyNarrative()}
                    >
                      {i18n.translate('xpack.ux.reports.ai.copyButtonLabel', {
                        defaultMessage: 'Copy markdown',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
                {canOpenAnalyst && narrative && !streaming && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="uxReportAiContinueAnalyst"
                      iconType="sortRight"
                      onClick={openAnalyst}
                    >
                      {i18n.translate('xpack.ux.reports.ai.continueInAnalystButtonLabel', {
                        defaultMessage: 'Continue in AI Analyst',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </>
          )}
          {error && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                announceOnMount
                color="danger"
                size="s"
                title={i18n.translate('xpack.ux.reports.ai.generateErrorTitle', {
                  defaultMessage: 'Unable to generate narrative',
                })}
              >
                <p>{error}</p>
              </EuiCallOut>
            </>
          )}
        </div>
        {narrative && (
          <div css={articleCss} data-test-subj="uxReportAiNarrative">
            <EuiMarkdownFormat textSize="s">{narrative}</EuiMarkdownFormat>
          </div>
        )}
      </EuiPanel>
    </>
  );
}
