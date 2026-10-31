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
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InferenceConnector } from '@kbn/inference-common';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import React, { useCallback, useEffect, useState } from 'react';
import type { RumReportTemplateId } from '../../../../common/rum_report';
import {
  DEFAULT_SCHEDULE_SPEC,
  formatScheduleLabel,
  parseRecipientList,
  type RumEmailConnectorOption,
  type RumReportSchedule,
  type RumReportScheduleFilters,
  type RumReportScheduleSpec,
} from '../../../../common/rum_report_schedule';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { useUxFlyoutSession, uxFlyoutProps } from '../../flyout/ux_flyout_props';
import { ScheduleCadenceFields } from './schedule_cadence_fields';
import {
  createRumReportSchedule,
  deleteRumReportSchedule,
  fetchRumEmailConnectors,
  fetchRumReportSchedules,
  sendRumReportNow,
  sendRumReportScheduleNow,
  updateRumReportSchedule,
} from '../../../services/rest/rum_schedule_api';

function FlyoutSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
      {description && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p>{description}</p>
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />
      {children}
    </EuiPanel>
  );
}

export function ScheduleEmailFlyout({
  templateId,
  title,
  filters,
  rangeFrom,
  rangeTo,
  compare,
  onClose,
}: {
  templateId: RumReportTemplateId;
  title: string;
  filters: RumReportScheduleFilters;
  rangeFrom: string;
  rangeTo: string;
  compare?: string;
  onClose: () => void;
}) {
  const { http, notifications, application, inference, uiSettings } = useKibanaServices();
  const session = useUxFlyoutSession();
  const [connectors, setConnectors] = useState<RumEmailConnectorOption[]>([]);
  const [aiConnectors, setAiConnectors] = useState<InferenceConnector[]>([]);
  const [schedules, setSchedules] = useState<RumReportSchedule[]>([]);
  const [connectorId, setConnectorId] = useState('');
  const [inferenceConnectorId, setInferenceConnectorId] = useState('');
  const [includeAi, setIncludeAi] = useState(false);
  const [recipients, setRecipients] = useState('');
  const [spec, setSpec] = useState<RumReportScheduleSpec>(DEFAULT_SCHEDULE_SPEC);
  const [name, setName] = useState(title);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextConnectors, nextSchedules, nextAiConnectors] = await Promise.all([
        fetchRumEmailConnectors(http),
        fetchRumReportSchedules(http),
        inference.getConnectors().catch(() => []),
      ]);
      setConnectors(nextConnectors);
      setSchedules(nextSchedules);
      const usableAi = nextAiConnectors.filter((connector) => !connector.isMissingSecrets);
      setAiConnectors(usableAi);
      setConnectorId((current) => current || nextConnectors[0]?.id || '');
      const settingsDefault = uiSettings.get<string | undefined>(
        GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
      );
      const preferredAi =
        usableAi.find((connector) => connector.connectorId === settingsDefault) ?? usableAi[0];
      setInferenceConnectorId((current) => current || preferredAi?.connectorId || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [http, inference, uiSettings]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const to = parseRecipientList(recipients);
  const canSend = Boolean(connectorId && to.length > 0 && (!includeAi || inferenceConnectorId));

  const onCreate = async () => {
    if (!canSend) {
      return;
    }
    setSaving(true);
    try {
      await createRumReportSchedule(http, {
        name: name.trim() || title,
        ...spec,
        connectorId,
        to,
        templateId,
        filters,
        includeAi,
        inferenceConnectorId: includeAi ? inferenceConnectorId : undefined,
      });
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.reports.schedule.createdTitle', {
          defaultMessage: 'Email schedule saved',
        })
      );
      setRecipients('');
      await reload();
    } catch (err) {
      notifications.toasts.addError(err instanceof Error ? err : new Error(String(err)), {
        title: i18n.translate('xpack.ux.reports.schedule.createErrorTitle', {
          defaultMessage: 'Unable to save schedule',
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  const onSendNow = async () => {
    if (!canSend) {
      return;
    }
    setSendingNow(true);
    try {
      await sendRumReportNow(http, {
        connectorId,
        to,
        templateId,
        filters,
        rangeFrom,
        rangeTo,
        compare,
        name: name.trim() || title,
        includeAi,
        inferenceConnectorId: includeAi ? inferenceConnectorId : undefined,
      });
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.reports.schedule.sentTitle', {
          defaultMessage: 'Report emailed',
        })
      );
    } catch (err) {
      notifications.toasts.addError(err instanceof Error ? err : new Error(String(err)), {
        title: i18n.translate('xpack.ux.reports.schedule.sendErrorTitle', {
          defaultMessage: 'Unable to send report',
        }),
      });
    } finally {
      setSendingNow(false);
    }
  };

  const flyoutTitle = i18n.translate('xpack.ux.reports.schedule.flyoutTitle', {
    defaultMessage: 'Email this report',
  });

  return (
    <EuiFlyout
      {...uxFlyoutProps({ title: flyoutTitle, size: 's', session })}
      onClose={onClose}
      aria-labelledby="uxReportScheduleTitle"
      data-test-subj="uxReportScheduleFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="uxReportScheduleTitle">{flyoutTitle}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.reports.schedule.flyoutSubtitle', {
              defaultMessage: 'Send this report now, or save a recurring schedule.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error && (
          <EuiCallOut
            announceOnMount
            color="danger"
            title={i18n.translate('xpack.ux.reports.schedule.loadErrorTitle', {
              defaultMessage: 'Unable to load email schedules',
            })}
          >
            <p>{error}</p>
          </EuiCallOut>
        )}
        {!loading && connectors.length === 0 && (
          <EuiCallOut
            announceOnMount
            color="warning"
            title={i18n.translate('xpack.ux.reports.schedule.noConnectorTitle', {
              defaultMessage: 'No email connector',
            })}
          >
            <p>
              {i18n.translate('xpack.ux.reports.schedule.noConnectorDescription', {
                defaultMessage:
                  'Create an Email connector in Stack Management, then come back to schedule this report.',
              })}
            </p>
            <EuiButtonEmpty
              data-test-subj="uxReportScheduleOpenConnectors"
              onClick={() =>
                application.navigateToApp('management', {
                  path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
                })
              }
            >
              {i18n.translate('xpack.ux.reports.schedule.openConnectorsButtonLabel', {
                defaultMessage: 'Open connectors',
              })}
            </EuiButtonEmpty>
          </EuiCallOut>
        )}
        <EuiForm component="form">
          <FlyoutSection
            title={i18n.translate('xpack.ux.reports.schedule.deliverySectionTitle', {
              defaultMessage: 'Delivery',
            })}
            description={i18n.translate('xpack.ux.reports.schedule.deliverySectionDescription', {
              defaultMessage: 'Who receives this report, and which email connector sends it.',
            })}
          >
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ux.reports.schedule.nameLabel', {
                defaultMessage: 'Name',
              })}
            >
              <EuiFieldText
                fullWidth
                data-test-subj="uxReportScheduleName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.ux.reports.schedule.connectorLabel', {
                defaultMessage: 'Email connector',
              })}
            >
              <EuiSelect
                fullWidth
                data-test-subj="uxReportScheduleConnector"
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
              label={i18n.translate('xpack.ux.reports.schedule.recipientsLabel', {
                defaultMessage: 'Recipients',
              })}
              helpText={i18n.translate('xpack.ux.reports.schedule.recipientsHelp', {
                defaultMessage: 'Comma-separated addresses',
              })}
            >
              <EuiFieldText
                fullWidth
                data-test-subj="uxReportScheduleRecipients"
                value={recipients}
                onChange={(event) => setRecipients(event.target.value)}
                placeholder="ops@example.com"
              />
            </EuiFormRow>
          </FlyoutSection>
          <EuiSpacer />
          <FlyoutSection
            title={i18n.translate('xpack.ux.reports.schedule.scheduleSectionTitle', {
              defaultMessage: 'Schedule',
            })}
            description={i18n.translate('xpack.ux.reports.schedule.scheduleSectionDescription', {
              defaultMessage:
                'Used when you save a schedule. Each run emails the last complete day, week, or month.',
            })}
          >
            <ScheduleCadenceFields spec={spec} onChange={setSpec} />
          </FlyoutSection>
          <EuiSpacer />
          <FlyoutSection
            title={i18n.translate('xpack.ux.reports.schedule.aiSectionTitle', {
              defaultMessage: 'AI summary',
            })}
            description={i18n.translate('xpack.ux.reports.schedule.aiHelp', {
              defaultMessage:
                'Writes a stakeholder summary from this report, then emails it above the metrics.',
            })}
          >
            <EuiFormRow>
              <EuiSwitch
                data-test-subj="uxReportScheduleIncludeAi"
                label={i18n.translate('xpack.ux.reports.schedule.aiSwitchLabel', {
                  defaultMessage: 'Enhance with AI',
                })}
                checked={includeAi}
                disabled={aiConnectors.length === 0}
                onChange={(event) => setIncludeAi(event.target.checked)}
              />
            </EuiFormRow>
            {includeAi && aiConnectors.length > 0 && (
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.ux.reports.schedule.aiConnectorLabel', {
                  defaultMessage: 'GenAI connector',
                })}
              >
                <EuiSelect
                  fullWidth
                  data-test-subj="uxReportScheduleAiConnector"
                  options={aiConnectors.map((connector) => ({
                    value: connector.connectorId,
                    text: connector.name,
                  }))}
                  value={inferenceConnectorId}
                  onChange={(event) => setInferenceConnectorId(event.target.value)}
                />
              </EuiFormRow>
            )}
            {aiConnectors.length === 0 && (
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate('xpack.ux.reports.schedule.aiMissingConnectorDescription', {
                    defaultMessage: 'Add a GenAI connector to summarize the report before sending.',
                  })}
                </p>
              </EuiText>
            )}
          </FlyoutSection>
        </EuiForm>
        {schedules.length > 0 && (
          <>
            <EuiSpacer />
            <FlyoutSection
              title={i18n.translate('xpack.ux.reports.schedule.existingTitle', {
                defaultMessage: 'Saved schedules',
              })}
            >
              {schedules.map((schedule, index) => (
                <React.Fragment key={schedule.id}>
                  {index > 0 && <EuiSpacer size="s" />}
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <p>
                          <strong>{schedule.name}</strong>
                          <br />
                          {schedule.to.join(', ')} · {formatScheduleLabel(schedule)}
                          {schedule.includeAi
                            ? ` · ${i18n.translate(
                                'xpack.ux.reports.schedule.aiEnabledBadgeLabel',
                                {
                                  defaultMessage: 'AI summary',
                                }
                              )}`
                            : ''}
                          {schedule.lastError ? ` · ${schedule.lastError}` : ''}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        data-test-subj={`uxReportScheduleEnabled-${schedule.id}`}
                        label={i18n.translate('xpack.ux.reports.schedule.enabledLabel', {
                          defaultMessage: 'On',
                        })}
                        checked={schedule.enabled}
                        compressed
                        onChange={(event) => {
                          void updateRumReportSchedule(http, schedule.id, {
                            enabled: event.target.checked,
                          }).then(reload);
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        data-test-subj={`uxReportScheduleSendNow-${schedule.id}`}
                        size="s"
                        isLoading={sendingId === schedule.id}
                        onClick={() => {
                          setSendingId(schedule.id);
                          void sendRumReportScheduleNow(http, schedule.id)
                            .then(() => {
                              notifications.toasts.addSuccess(
                                i18n.translate('xpack.ux.reports.schedule.sentTitle', {
                                  defaultMessage: 'Report emailed',
                                })
                              );
                              return reload();
                            })
                            .catch((err) => {
                              notifications.toasts.addError(
                                err instanceof Error ? err : new Error(String(err)),
                                {
                                  title: i18n.translate(
                                    'xpack.ux.reports.schedule.sendErrorTitle',
                                    {
                                      defaultMessage: 'Unable to send report',
                                    }
                                  ),
                                }
                              );
                            })
                            .finally(() => setSendingId(null));
                        }}
                      >
                        {i18n.translate('xpack.ux.reports.schedule.sendNowButtonLabel', {
                          defaultMessage: 'Send now',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        data-test-subj={`uxReportScheduleDelete-${schedule.id}`}
                        size="s"
                        color="danger"
                        onClick={() => {
                          void deleteRumReportSchedule(http, schedule.id).then(reload);
                        }}
                      >
                        {i18n.translate('xpack.ux.reports.schedule.deleteButtonLabel', {
                          defaultMessage: 'Delete',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </React.Fragment>
              ))}
            </FlyoutSection>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="uxReportScheduleClose" onClick={onClose}>
              {i18n.translate('xpack.ux.reports.schedule.closeButtonLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="uxReportScheduleSendNow"
                  isLoading={sendingNow}
                  disabled={!canSend}
                  onClick={() => void onSendNow()}
                >
                  {i18n.translate('xpack.ux.reports.schedule.sendNowButtonLabel', {
                    defaultMessage: 'Send now',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="uxReportScheduleSave"
                  fill
                  isLoading={saving}
                  disabled={!canSend}
                  onClick={() => void onCreate()}
                >
                  {i18n.translate('xpack.ux.reports.schedule.saveButtonLabel', {
                    defaultMessage: 'Save schedule',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
