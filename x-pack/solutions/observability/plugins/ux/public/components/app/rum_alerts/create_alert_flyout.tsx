/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { isPlaceholderRumAlertEsql } from '../../../../common/rum_alert_esql';
import {
  buildRumAlertEsql,
  defaultAlertName,
  isRumAiAlertTemplate,
  isRumSessionAlertTemplate,
  isRumTrafficAlertTemplate,
  RUM_ALERT_TEMPLATE_IDS,
  rumAlertDefaults,
  rumAlertTemplateDescription,
  rumAlertTemplateLabel,
  type RumAlertTemplateId,
  type RumAlertVital,
} from '../../../../common/rum_alerts';
import { parseRecipientList } from '../../../../common/rum_report_schedule';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { useUxFlyoutSession, uxFlyoutProps } from '../../flyout/ux_flyout_props';
import {
  createRumAlert,
  fetchRumAlertStatus,
  generateRumAlertEsql,
  upsertRumAlertNotifications,
} from '../../../services/rest/rum_alerts_api';
import { fetchRumAnalyticsStatus } from '../../../services/rest/rum_analytics_api';
import { fetchRumEmailConnectors } from '../../../services/rest/rum_schedule_api';
import { AlertEsqlPreview } from './alert_esql_preview';
import type { RumAlertDraft } from './alert_flyout_context';

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

export function CreateAlertFlyout({
  draft,
  onClose,
}: {
  draft: RumAlertDraft;
  onClose: () => void;
}) {
  const { http, notifications } = useKibanaServices();
  const { euiTheme } = useEuiTheme();
  const session = useUxFlyoutSession();
  const {
    urlParams: { serviceName, browser, location, pageUrl },
  } = useLegacyUrlParams();
  const defaults = rumAlertDefaults(draft.templateId);
  const [templateId, setTemplateId] = useState<RumAlertTemplateId>(draft.templateId);
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState(draft.threshold ?? defaults.threshold);
  const [minSamples, setMinSamples] = useState(defaults.minSamples);
  const [groupByPage, setGroupByPage] = useState(!isRumTrafficAlertTemplate(draft.templateId));
  const [vital, setVital] = useState<RumAlertVital>(draft.vital ?? 'lcp');
  const [errorType, setErrorType] = useState(draft.errorType ?? '');
  const [errorMessage, setErrorMessage] = useState(draft.errorMessage ?? '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [sessionAnalyticsReady, setSessionAnalyticsReady] = useState(false);
  const [connectorId, setConnectorId] = useState('');
  const [recipients, setRecipients] = useState('');
  const [connectors, setConnectors] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      serviceName: typeof serviceName === 'string' ? serviceName : undefined,
      browser,
      location: typeof location === 'string' ? location : undefined,
      pageUrl: draft.pageUrl || pageUrl,
    }),
    [browser, draft.pageUrl, location, pageUrl, serviceName]
  );

  const built = useMemo(
    () =>
      buildRumAlertEsql({
        templateId,
        threshold,
        minSamples,
        groupByPage,
        lookback: rumAlertDefaults(templateId).lookback,
        every: rumAlertDefaults(templateId).every,
        vital,
        errorType: errorType || undefined,
        errorMessage: errorMessage || undefined,
        prompt: aiPrompt,
        esqlQuery: isRumAiAlertTemplate(templateId) ? aiQuery : undefined,
        filters,
      }),
    [
      aiPrompt,
      aiQuery,
      errorMessage,
      errorType,
      filters,
      groupByPage,
      minSamples,
      templateId,
      threshold,
      vital,
    ]
  );

  useEffect(() => {
    const next = rumAlertDefaults(templateId);
    setThreshold(
      draft.templateId === templateId && draft.threshold != null ? draft.threshold : next.threshold
    );
    setMinSamples(next.minSamples);
    setGroupByPage(
      !isRumTrafficAlertTemplate(templateId) &&
        !isRumAiAlertTemplate(templateId) &&
        !isRumSessionAlertTemplate(templateId)
    );
  }, [draft.templateId, draft.threshold, templateId]);

  useEffect(() => {
    void (async () => {
      try {
        const [list, status, analytics] = await Promise.all([
          fetchRumEmailConnectors(http),
          fetchRumAlertStatus(http),
          fetchRumAnalyticsStatus({ http }).catch(() => null),
        ]);
        setConnectors(list);
        setAiAvailable(status.aiAvailable !== false);
        setSessionAnalyticsReady(Boolean(analytics?.installed && analytics.watermark));
        if (status.connectorId) {
          setConnectorId(status.connectorId);
        } else if (list[0]) {
          setConnectorId(list[0].id);
        }
        if (status.to.length > 0) {
          setRecipients(status.to.join(', '));
        }
      } catch {
        setConnectors([]);
        setSessionAnalyticsReady(false);
      }
    })();
  }, [http]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateRumAlertEsql(http, { prompt: aiPrompt.trim(), filters });
      setAiQuery(result.query);
      if (!name.trim()) {
        setName(result.description.slice(0, 80));
      }
    } catch (err) {
      const message = httpErrorMessage(err);
      setError(message);
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.alerts.create.generateFailedTitle', {
          defaultMessage: 'Unable to generate ES|QL',
        }),
        text: message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isRumAiAlertTemplate(templateId) && isPlaceholderRumAlertEsql(built.query)) {
        throw new Error(
          i18n.translate('xpack.ux.alerts.create.aiQueryRequiredErrorMessage', {
            defaultMessage: 'Generate ES|QL before creating this alert.',
          })
        );
      }
      const to = parseRecipientList(recipients);
      if (connectorId && to.length > 0) {
        await upsertRumAlertNotifications(http, { connectorId, to });
      }
      await createRumAlert(http, {
        templateId,
        threshold,
        name:
          name.trim() ||
          defaultAlertName({
            templateId,
            threshold,
            minSamples,
            groupByPage,
            lookback: built.lookback,
            every: built.every,
            vital,
            prompt: aiPrompt,
            esqlQuery: aiQuery,
            filters,
          }),
        minSamples,
        groupByPage,
        lookback: built.lookback,
        every: built.every,
        vital: templateId === 'web_vital' ? vital : undefined,
        errorType: errorType || undefined,
        errorMessage: errorMessage || undefined,
        prompt: isRumAiAlertTemplate(templateId) ? aiPrompt : undefined,
        query: isRumAiAlertTemplate(templateId) ? aiQuery : undefined,
        filters,
      });
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.alerts.create.successToast', {
          defaultMessage: 'Alert created',
        })
      );
      onClose();
    } catch (err) {
      setError(httpErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const isAi = isRumAiAlertTemplate(templateId);
  const flyoutTitle = i18n.translate('xpack.ux.alerts.create.title', {
    defaultMessage: 'Create RUM alert',
  });

  return (
    <EuiFlyout
      {...uxFlyoutProps({ title: flyoutTitle, size: 'l', session })}
      onClose={onClose}
      aria-labelledby="uxCreateAlertFlyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="uxCreateAlertFlyoutTitle">{flyoutTitle}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.alerts.create.subtitle', {
              defaultMessage: 'Pick a template. The app writes the ES|QL and emails breaches.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error && (
          <EuiCallOut
            announceOnMount
            color="danger"
            title={i18n.translate('xpack.ux.alerts.create.errorTitle', {
              defaultMessage: 'Unable to create alert',
            })}
          >
            <p>{error}</p>
          </EuiCallOut>
        )}
        <EuiForm component="form">
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.alerts.create.templateSection', {
                  defaultMessage: 'Template',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            {!sessionAnalyticsReady && (
              <>
                <EuiCallOut
                  announceOnMount
                  color="primary"
                  size="s"
                  title={i18n.translate('xpack.ux.alerts.create.sessionAnalyticsTitle', {
                    defaultMessage: 'Session-level alerts need session analytics',
                  })}
                >
                  <p>
                    {i18n.translate('xpack.ux.alerts.create.sessionAnalyticsDescription', {
                      defaultMessage:
                        'Enable session analytics in Capture settings so session error, frustration, and traffic alerts can read the session index.',
                    })}
                  </p>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            )}
            <div
              css={css`
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: ${euiTheme.size.s};
                .euiCheckableCard {
                  height: 100%;
                }
              `}
            >
              {RUM_ALERT_TEMPLATE_IDS.map((id) => (
                <EuiCheckableCard
                  key={id}
                  id={`ux-alert-template-${id}`}
                  name="ux-alert-template"
                  label={rumAlertTemplateLabel(id)}
                  checked={templateId === id}
                  disabled={isRumSessionAlertTemplate(id) && !sessionAnalyticsReady}
                  onChange={() => setTemplateId(id)}
                >
                  <EuiText size="xs" color="subdued">
                    {rumAlertTemplateDescription(id)}
                  </EuiText>
                </EuiCheckableCard>
              ))}
            </div>
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.alerts.create.conditionSection', {
                  defaultMessage: 'Condition',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ux.alerts.create.nameLabel', { defaultMessage: 'Name' })}
            >
              <EuiFieldText
                fullWidth
                data-test-subj="uxAlertName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={defaultAlertName({
                  templateId,
                  threshold,
                  minSamples,
                  groupByPage,
                  lookback: built.lookback,
                  every: built.every,
                  vital,
                  prompt: aiPrompt,
                  esqlQuery: aiQuery,
                  filters,
                })}
              />
            </EuiFormRow>
            {isAi && (
              <>
                {!aiAvailable && (
                  <EuiCallOut
                    announceOnMount
                    color="warning"
                    size="s"
                    title={i18n.translate('xpack.ux.alerts.create.aiUnavailableTitle', {
                      defaultMessage: 'GenAI is not available',
                    })}
                  >
                    <p>
                      {i18n.translate('xpack.ux.alerts.create.aiUnavailableDescription', {
                        defaultMessage:
                          'Configure a Kibana inference connector to generate ES|QL from a description.',
                      })}
                    </p>
                  </EuiCallOut>
                )}
                <EuiFormRow
                  fullWidth
                  label={i18n.translate('xpack.ux.alerts.create.aiPromptLabel', {
                    defaultMessage: 'Condition in plain language',
                  })}
                  helpText={i18n.translate('xpack.ux.alerts.create.aiPromptHelpText', {
                    defaultMessage:
                      'Example: Alert when p75 LCP on /checkout is over 4s with at least 20 samples.',
                  })}
                >
                  <EuiTextArea
                    fullWidth
                    data-test-subj="uxAlertAiPrompt"
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    rows={3}
                    maxLength={2000}
                  />
                </EuiFormRow>
                <EuiFormRow>
                  <EuiButton
                    data-test-subj="uxAlertAiGenerate"
                    isLoading={generating}
                    disabled={!aiPrompt.trim() || !aiAvailable}
                    onClick={() => void generate()}
                  >
                    {i18n.translate('xpack.ux.alerts.create.generateEsqlButtonLabel', {
                      defaultMessage: 'Generate ES|QL',
                    })}
                  </EuiButton>
                </EuiFormRow>
                {error && (
                  <EuiCallOut
                    announceOnMount
                    color="danger"
                    size="s"
                    title={i18n.translate('xpack.ux.alerts.create.generateFailedTitle', {
                      defaultMessage: 'Unable to generate ES|QL',
                    })}
                  >
                    <p>{error}</p>
                  </EuiCallOut>
                )}
              </>
            )}
            {templateId === 'web_vital' && (
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.ux.alerts.create.vitalLabel', {
                  defaultMessage: 'Web vital',
                })}
              >
                <EuiSelect
                  fullWidth
                  data-test-subj="uxAlertVital"
                  options={[
                    { value: 'lcp', text: 'LCP' },
                    { value: 'inp', text: 'INP' },
                    { value: 'cls', text: 'CLS' },
                  ]}
                  value={vital}
                  onChange={(event) => setVital(event.target.value as RumAlertVital)}
                />
              </EuiFormRow>
            )}
            {!isAi && (
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.ux.alerts.create.thresholdLabel', {
                  defaultMessage: 'Threshold',
                })}
                helpText={built.description}
              >
                <EuiFieldNumber
                  fullWidth
                  data-test-subj="uxAlertThreshold"
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  step={
                    templateId === 'error_rate' ||
                    templateId === 'session_error_rate' ||
                    vital === 'cls'
                      ? 0.01
                      : 1
                  }
                />
              </EuiFormRow>
            )}
            {templateId === 'error_spike' && (
              <>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate('xpack.ux.alerts.create.errorTypeLabel', {
                    defaultMessage: 'Exception type',
                  })}
                >
                  <EuiFieldText
                    fullWidth
                    data-test-subj="uxAlertErrorType"
                    value={errorType}
                    onChange={(event) => setErrorType(event.target.value)}
                  />
                </EuiFormRow>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate('xpack.ux.alerts.create.errorMessageLabel', {
                    defaultMessage: 'Message starts with',
                  })}
                >
                  <EuiFieldText
                    fullWidth
                    data-test-subj="uxAlertErrorMessage"
                    value={errorMessage}
                    onChange={(event) => setErrorMessage(event.target.value)}
                  />
                </EuiFormRow>
              </>
            )}
            {templateId !== 'error_spike' &&
              !isRumTrafficAlertTemplate(templateId) &&
              !isRumSessionAlertTemplate(templateId) &&
              !isAi && (
                <EuiFormRow>
                  <EuiSwitch
                    data-test-subj="uxAlertGroupByPage"
                    label={i18n.translate('xpack.ux.alerts.create.groupByPageLabel', {
                      defaultMessage: 'Group by page',
                    })}
                    checked={groupByPage}
                    onChange={(event) => setGroupByPage(event.target.checked)}
                  />
                </EuiFormRow>
              )}
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ux.alerts.create.esqlLabel', {
                defaultMessage: 'Generated ES|QL',
              })}
            >
              {isAi ? (
                <EuiTextArea
                  fullWidth
                  data-test-subj="uxAlertAiQuery"
                  value={aiQuery}
                  onChange={(event) => setAiQuery(event.target.value)}
                  rows={8}
                  disabled={isPlaceholderRumAlertEsql(built.query) && !aiQuery}
                />
              ) : (
                <EuiCodeBlock language="sql" fontSize="s" paddingSize="s" isCopyable>
                  {built.query}
                </EuiCodeBlock>
              )}
            </EuiFormRow>
            <EuiSpacer />
            <AlertEsqlPreview
              query={built.query}
              lookback={built.lookback}
              threshold={isAi ? undefined : threshold}
            />
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.alerts.create.notifySection', {
                  defaultMessage: 'Email on breach',
                })}
              </h3>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate('xpack.ux.alerts.create.notifyHelp', {
                  defaultMessage:
                    'Provisions one workflow and action policy for all UX RUM alerts.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ux.alerts.create.connectorLabel', {
                defaultMessage: 'Email connector',
              })}
            >
              <EuiSelect
                fullWidth
                data-test-subj="uxAlertConnector"
                options={connectors.map((connector) => ({
                  value: connector.id,
                  text: connector.name,
                }))}
                value={connectorId}
                onChange={(event) => setConnectorId(event.target.value)}
                disabled={connectors.length === 0}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ux.alerts.create.recipientsLabel', {
                defaultMessage: 'Recipients',
              })}
            >
              <EuiFieldText
                fullWidth
                data-test-subj="uxAlertRecipients"
                value={recipients}
                onChange={(event) => setRecipients(event.target.value)}
                placeholder="ops@example.com"
              />
            </EuiFormRow>
          </EuiPanel>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="uxAlertCancel" onClick={onClose}>
              {i18n.translate('xpack.ux.alerts.create.cancel', { defaultMessage: 'Cancel' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uxAlertSave"
              fill
              isLoading={saving}
              disabled={isRumSessionAlertTemplate(templateId) && !sessionAnalyticsReady}
              onClick={() => void save()}
            >
              {i18n.translate('xpack.ux.alerts.create.save', { defaultMessage: 'Create alert' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
