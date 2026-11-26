/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DEFAULT_REPORT_LOOKBACK_DAYS,
  MAX_REPORT_RECIPIENTS,
  MAX_SCHEDULED_REPORT_NAME_LENGTH,
  REPORT_FREQUENCIES,
  REPORT_WEEKDAYS,
  SCHEDULED_REPORTS_CREATE_ENDPOINT,
  SCHEDULED_REPORT_UPDATE_ENDPOINT,
  type ReportFrequency,
  type ReportType,
  type ReportWeekday,
  type ScheduledReport,
  type ScheduledReportInput,
} from '../../../../common/types/scheduled_reports';
import { MAX_ENVIRONMENT_LENGTH } from '../../../../common/filter_lengths';
import { useApiClient } from '../../../hooks/use_api_client';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import {
  FREQUENCY_LABELS,
  WEEKDAY_LONG_LABELS,
  getDefaultScheduleName,
  getDefaultTimeZone,
  getTimeZoneOptions,
  isValidEmail,
} from './describe_schedule';
import { useEmailConnectors } from './use_email_connectors';

export interface ScheduleReportFlyoutProps {
  serviceName: string;
  /** Report template to schedule when creating; inferred from `report` when editing. */
  reportType?: ReportType;
  /** Default environment preselected when creating a new schedule. */
  defaultEnvironment?: string;
  /** Known environments for the application; shows a select when non-empty. */
  environments?: string[];
  /** Existing report when editing; undefined when creating. */
  report?: ScheduledReport;
  onClose: () => void;
  onSaved?: (report: ScheduledReport) => void;
}

const BASE_LOOKBACK_DAYS = [1, 7, 14, 30] as const;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  text: String(hour).padStart(2, '0'),
}));
const BASE_MINUTES = [0, 15, 30, 45] as const;
const MONTHDAY_OPTIONS = Array.from({ length: 28 }, (_, index) => ({
  value: String(index + 1),
  text: String(index + 1),
}));

const formatLookbackLabel = (days: number): string =>
  days === 1
    ? i18n.translate('xpack.digitalExperience.reports.scheduleForm.lookbackOneDay', {
        defaultMessage: 'Last 1 day',
      })
    : i18n.translate('xpack.digitalExperience.reports.scheduleForm.lookbackDays', {
        defaultMessage: 'Last {days} days',
        values: { days },
      });

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return i18n.translate('xpack.digitalExperience.reports.scheduleForm.saveFallbackError', {
    defaultMessage: 'Could not save the scheduled report.',
  });
};

/** Flyout to create or edit a managed scheduled report. */
export function ScheduleReportFlyout({
  serviceName,
  reportType,
  defaultEnvironment,
  environments,
  report,
  onClose,
  onSaved,
}: ScheduleReportFlyoutProps) {
  const isEditing = report !== undefined;
  const effectiveReportType: ReportType = report?.reportType ?? reportType ?? 'scorecard';
  const apiClient = useApiClient();
  const {
    application,
    notifications: { toasts },
  } = useKibanaServices();
  const {
    emailConnectors,
    isLoading: isLoadingConnectors,
    error: connectorsError,
    refresh: refreshConnectors,
  } = useEmailConnectors(true);

  const titleId = useGeneratedHtmlId({ prefix: 'dexScheduleReportTitle' });
  const formId = useGeneratedHtmlId({ prefix: 'dexScheduleReportForm' });

  const [name, setName] = useState(
    () => report?.name ?? getDefaultScheduleName(serviceName, defaultEnvironment)
  );
  const [environment, setEnvironment] = useState(
    () => report?.environment ?? defaultEnvironment ?? ''
  );
  const [lookbackDays, setLookbackDays] = useState(
    () => report?.lookbackDays ?? DEFAULT_REPORT_LOOKBACK_DAYS
  );
  const [frequency, setFrequency] = useState<ReportFrequency>(
    () => report?.schedule.frequency ?? 'WEEKLY'
  );
  const [weekday, setWeekday] = useState<ReportWeekday>(() => report?.schedule.weekday ?? 'MO');
  const [monthday, setMonthday] = useState<number>(() => report?.schedule.monthday ?? 1);
  const [hour, setHour] = useState<number>(() => report?.schedule.hour ?? 9);
  const [minute, setMinute] = useState<number>(() => report?.schedule.minute ?? 0);
  const [timeZone, setTimeZone] = useState<string>(
    () => report?.schedule.timeZone ?? getDefaultTimeZone()
  );
  const [connectorId, setConnectorId] = useState<string>(() => report?.connectorId ?? '');
  const [recipients, setRecipients] = useState<string[]>(() => report?.recipients ?? []);
  const [recipientInput, setRecipientInput] = useState('');
  const [enabled, setEnabled] = useState<boolean>(() => report?.enabled ?? true);

  const [submitted, setSubmitted] = useState(false);
  const [recipientError, setRecipientError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  // Auto-select the first available email connector when creating a new schedule.
  useEffect(() => {
    if (!isEditing && !connectorId && emailConnectors.length > 0) {
      setConnectorId(emailConnectors[0].id);
    }
  }, [isEditing, connectorId, emailConnectors]);

  const timeZoneOptions = useMemo<EuiComboBoxOptionOption[]>(() => {
    const zones = getTimeZoneOptions();
    const withCurrent = zones.includes(timeZone) ? zones : [timeZone, ...zones];
    return withCurrent.map((zone) => ({ label: zone }));
  }, [timeZone]);

  const environmentSelectOptions = useMemo(() => {
    const known = new Set(environments ?? []);
    if (environment) {
      known.add(environment);
    }
    if (known.size === 0) {
      return undefined;
    }
    return [
      {
        value: '',
        text: i18n.translate('xpack.digitalExperience.reports.scheduleForm.allEnvironments', {
          defaultMessage: 'All environments',
        }),
      },
      ...[...known].sort().map((value) => ({ value, text: value })),
    ];
  }, [environments, environment]);

  const lookbackOptions = useMemo(() => {
    const values = new Set<number>(BASE_LOOKBACK_DAYS);
    values.add(lookbackDays);
    return [...values]
      .sort((a, b) => a - b)
      .map((days) => ({ value: String(days), text: formatLookbackLabel(days) }));
  }, [lookbackDays]);

  const minuteOptions = useMemo(() => {
    const values = new Set<number>(BASE_MINUTES);
    values.add(minute);
    return [...values]
      .sort((a, b) => a - b)
      .map((value) => ({ value: String(value), text: String(value).padStart(2, '0') }));
  }, [minute]);

  const connectorExists = emailConnectors.some(({ id }) => id === connectorId);
  const missingSavedConnector =
    !isLoadingConnectors && !connectorsError && Boolean(connectorId) && !connectorExists;

  const connectorOptions = useMemo(() => {
    const options = emailConnectors.map(({ id, name: connectorName }) => ({
      value: id,
      text: connectorName,
    }));
    if (!connectorId || missingSavedConnector) {
      return [
        {
          value: '',
          text: i18n.translate('xpack.digitalExperience.reports.scheduleForm.selectConnector', {
            defaultMessage: 'Select an email connector',
          }),
        },
        ...options,
      ];
    }
    return options;
  }, [emailConnectors, connectorId, missingSavedConnector]);

  const connectorsUrl = application.getUrlForApp('management', {
    path: '/insightsAndAlerting/triggersActions/connectors',
  });

  const nameError =
    submitted && name.trim().length === 0
      ? i18n.translate('xpack.digitalExperience.reports.scheduleForm.nameRequired', {
          defaultMessage: 'Enter a name for the scheduled report.',
        })
      : undefined;

  const connectorValidationError = missingSavedConnector
    ? i18n.translate('xpack.digitalExperience.reports.scheduleForm.connectorMissing', {
        defaultMessage:
          'The previously selected email connector is no longer available. Choose another connector.',
      })
    : submitted && !connectorExists
    ? i18n.translate('xpack.digitalExperience.reports.scheduleForm.connectorRequired', {
        defaultMessage: 'Select an email connector.',
      })
    : undefined;

  const recipientsValidationError =
    recipientError ??
    (submitted && recipients.length === 0
      ? i18n.translate('xpack.digitalExperience.reports.scheduleForm.recipientsRequired', {
          defaultMessage: 'Add at least one recipient email address.',
        })
      : undefined);

  const parseAndAppendRecipients = (rawValue: string): string[] | undefined => {
    const candidates = rawValue
      .split(/[\s,;]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (candidates.length === 0) {
      return recipients;
    }
    const invalid = candidates.find((candidate) => !isValidEmail(candidate));
    if (invalid) {
      setRecipientError(
        i18n.translate('xpack.digitalExperience.reports.scheduleForm.invalidEmail', {
          defaultMessage: '"{email}" is not a valid email address.',
          values: { email: invalid },
        })
      );
      return undefined;
    }
    const next = Array.from(new Set([...recipients, ...candidates]));
    if (next.length > MAX_REPORT_RECIPIENTS) {
      setRecipientError(
        i18n.translate('xpack.digitalExperience.reports.scheduleForm.tooManyRecipients', {
          defaultMessage: 'A scheduled report can have at most {max} recipients.',
          values: { max: MAX_REPORT_RECIPIENTS },
        })
      );
      return undefined;
    }
    setRecipientError(undefined);
    setRecipients(next);
    setRecipientInput('');
    return next;
  };

  const handleCreateRecipient = (searchValue: string) => {
    parseAndAppendRecipients(searchValue);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setSubmitError(undefined);

    // Commit any email address left typed in the input when the user clicks Save directly.
    const effectiveRecipients = recipientInput.trim()
      ? parseAndAppendRecipients(recipientInput)
      : recipients;

    const trimmedName = name.trim();
    if (
      !trimmedName ||
      !connectorExists ||
      !effectiveRecipients ||
      effectiveRecipients.length === 0
    ) {
      return;
    }

    const body: ScheduledReportInput = {
      reportType: effectiveReportType,
      name: trimmedName,
      ...(environment.trim() ? { environment: environment.trim() } : {}),
      lookbackDays,
      schedule: {
        frequency,
        ...(frequency === 'WEEKLY' ? { weekday } : {}),
        ...(frequency === 'MONTHLY' ? { monthday } : {}),
        hour,
        minute,
        timeZone,
      },
      connectorId,
      recipients: effectiveRecipients,
      enabled,
    };

    setIsSaving(true);
    try {
      const saved = isEditing
        ? await apiClient.fetch(SCHEDULED_REPORT_UPDATE_ENDPOINT, {
            params: { path: { serviceName, scheduleId: report.id }, body },
          })
        : await apiClient.fetch(SCHEDULED_REPORTS_CREATE_ENDPOINT, {
            params: { path: { serviceName }, body },
          });

      toasts.addSuccess(
        isEditing
          ? i18n.translate('xpack.digitalExperience.reports.scheduleForm.updatedToast', {
              defaultMessage: 'Updated {name}',
              values: { name: saved.name },
            })
          : i18n.translate('xpack.digitalExperience.reports.scheduleForm.createdToast', {
              defaultMessage: 'Scheduled {name}',
              values: { name: saved.name },
            })
      );
      onSaved?.(saved);
      onClose();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EuiFlyout
      ownFocus
      size="m"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="digitalExperienceScheduleReportFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {isEditing
              ? i18n.translate('xpack.digitalExperience.reports.scheduleForm.editTitle', {
                  defaultMessage: 'Edit scheduled report',
                })
              : i18n.translate('xpack.digitalExperience.reports.scheduleForm.createTitle', {
                  defaultMessage: 'Schedule scorecard report',
                })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {submitError && (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.translate('xpack.digitalExperience.reports.scheduleForm.saveErrorTitle', {
                defaultMessage: 'Could not save scheduled report',
              })}
              color="danger"
              iconType="alert"
              data-test-subj="digitalExperienceScheduleReportError"
            >
              <p>{submitError}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiForm id={formId} component="form" onSubmit={handleSubmit}>
          <EuiFormRow
            label={i18n.translate('xpack.digitalExperience.reports.scheduleForm.nameLabel', {
              defaultMessage: 'Report name',
            })}
            isInvalid={Boolean(nameError)}
            error={nameError}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={name}
              maxLength={MAX_SCHEDULED_REPORT_NAME_LENGTH}
              isInvalid={Boolean(nameError)}
              onChange={(event) => setName(event.target.value)}
              data-test-subj="digitalExperienceScheduleReportName"
            />
          </EuiFormRow>

          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.digitalExperience.reports.scheduleForm.environmentLabel',
                  { defaultMessage: 'Environment' }
                )}
                fullWidth
              >
                {environmentSelectOptions ? (
                  <EuiSelect
                    fullWidth
                    options={environmentSelectOptions}
                    value={environment}
                    onChange={(event) => setEnvironment(event.target.value)}
                    data-test-subj="digitalExperienceScheduleReportEnvironment"
                  />
                ) : (
                  <EuiFieldText
                    fullWidth
                    value={environment}
                    maxLength={MAX_ENVIRONMENT_LENGTH}
                    placeholder={i18n.translate(
                      'xpack.digitalExperience.reports.scheduleForm.allEnvironments',
                      { defaultMessage: 'All environments' }
                    )}
                    onChange={(event) => setEnvironment(event.target.value)}
                    data-test-subj="digitalExperienceScheduleReportEnvironment"
                  />
                )}
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.digitalExperience.reports.scheduleForm.lookbackLabel',
                  { defaultMessage: 'Reporting period' }
                )}
                fullWidth
              >
                <EuiSelect
                  fullWidth
                  options={lookbackOptions}
                  value={String(lookbackDays)}
                  onChange={(event) => setLookbackDays(Number(event.target.value))}
                  data-test-subj="digitalExperienceScheduleReportLookback"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiHorizontalRule margin="l" />

          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.digitalExperience.reports.scheduleForm.scheduleHeading', {
                defaultMessage: 'Schedule',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.digitalExperience.reports.scheduleForm.frequencyLabel',
                  { defaultMessage: 'Frequency' }
                )}
                fullWidth
              >
                <EuiSelect
                  fullWidth
                  options={REPORT_FREQUENCIES.map((value) => ({
                    value,
                    text: FREQUENCY_LABELS[value],
                  }))}
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value as ReportFrequency)}
                  data-test-subj="digitalExperienceScheduleReportFrequency"
                />
              </EuiFormRow>
            </EuiFlexItem>

            {frequency === 'WEEKLY' && (
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.digitalExperience.reports.scheduleForm.weekdayLabel',
                    { defaultMessage: 'Day of week' }
                  )}
                  fullWidth
                >
                  <EuiSelect
                    fullWidth
                    options={REPORT_WEEKDAYS.map((value) => ({
                      value,
                      text: WEEKDAY_LONG_LABELS[value],
                    }))}
                    value={weekday}
                    onChange={(event) => setWeekday(event.target.value as ReportWeekday)}
                    data-test-subj="digitalExperienceScheduleReportWeekday"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}

            {frequency === 'MONTHLY' && (
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.digitalExperience.reports.scheduleForm.monthdayLabel',
                    { defaultMessage: 'Day of month' }
                  )}
                  fullWidth
                >
                  <EuiSelect
                    fullWidth
                    options={MONTHDAY_OPTIONS}
                    value={String(monthday)}
                    onChange={(event) => setMonthday(Number(event.target.value))}
                    data-test-subj="digitalExperienceScheduleReportMonthday"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate('xpack.digitalExperience.reports.scheduleForm.hourLabel', {
                  defaultMessage: 'Hour',
                })}
              >
                <EuiSelect
                  options={HOUR_OPTIONS}
                  value={String(hour)}
                  onChange={(event) => setHour(Number(event.target.value))}
                  data-test-subj="digitalExperienceScheduleReportHour"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate('xpack.digitalExperience.reports.scheduleForm.minuteLabel', {
                  defaultMessage: 'Minute',
                })}
              >
                <EuiSelect
                  options={minuteOptions}
                  value={String(minute)}
                  onChange={(event) => setMinute(Number(event.target.value))}
                  data-test-subj="digitalExperienceScheduleReportMinute"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.digitalExperience.reports.scheduleForm.timeZoneLabel',
                  { defaultMessage: 'Time zone' }
                )}
                fullWidth
              >
                <EuiComboBox
                  fullWidth
                  singleSelection={{ asPlainText: true }}
                  isClearable={false}
                  options={timeZoneOptions}
                  selectedOptions={[{ label: timeZone }]}
                  onChange={(selected) => {
                    if (selected[0]?.label) {
                      setTimeZone(selected[0].label);
                    }
                  }}
                  data-test-subj="digitalExperienceScheduleReportTimeZone"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiHorizontalRule margin="l" />

          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.digitalExperience.reports.scheduleForm.deliveryHeading', {
                defaultMessage: 'Email delivery',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          {connectorsError ? (
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.digitalExperience.reports.scheduleForm.connectorsErrorTitle',
                { defaultMessage: 'Could not load email connectors' }
              )}
              color="danger"
              iconType="alert"
            >
              <p>{connectorsError.message}</p>
              <EuiButton
                data-test-subj="digitalExperienceScheduleReportFlyoutRetryButton"
                size="s"
                onClick={refreshConnectors}
              >
                {i18n.translate('xpack.digitalExperience.reports.scheduleForm.retryConnectors', {
                  defaultMessage: 'Retry',
                })}
              </EuiButton>
            </EuiCallOut>
          ) : !isLoadingConnectors && emailConnectors.length === 0 ? (
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.digitalExperience.reports.scheduleForm.noConnectorsTitle',
                { defaultMessage: 'No email connectors configured' }
              )}
              color="warning"
              iconType="alert"
              data-test-subj="digitalExperienceScheduleReportNoConnectors"
            >
              <p>
                {i18n.translate('xpack.digitalExperience.reports.scheduleForm.noConnectorsBody', {
                  defaultMessage:
                    'Create an Email connector in Stack Management to deliver scheduled reports.',
                })}{' '}
                <EuiLink
                  data-test-subj="digitalExperienceScheduleReportFlyoutOpenConnectorsLink"
                  href={connectorsUrl}
                  external
                >
                  {i18n.translate(
                    'xpack.digitalExperience.reports.scheduleForm.openConnectorsLink',
                    { defaultMessage: 'Open Connectors' }
                  )}
                </EuiLink>
              </p>
              <EuiButton
                data-test-subj="digitalExperienceScheduleReportFlyoutRefreshConnectorsButton"
                size="s"
                onClick={refreshConnectors}
              >
                {i18n.translate('xpack.digitalExperience.reports.scheduleForm.refreshConnectors', {
                  defaultMessage: 'Refresh connectors',
                })}
              </EuiButton>
            </EuiCallOut>
          ) : (
            <EuiFormRow
              label={i18n.translate('xpack.digitalExperience.reports.scheduleForm.connectorLabel', {
                defaultMessage: 'Email connector',
              })}
              isInvalid={Boolean(connectorValidationError)}
              error={connectorValidationError}
              fullWidth
            >
              <EuiSelect
                fullWidth
                isLoading={isLoadingConnectors}
                disabled={isLoadingConnectors}
                options={connectorOptions}
                value={connectorExists ? connectorId : ''}
                isInvalid={Boolean(connectorValidationError)}
                onChange={(event) => setConnectorId(event.target.value)}
                data-test-subj="digitalExperienceScheduleReportConnector"
              />
            </EuiFormRow>
          )}

          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.translate('xpack.digitalExperience.reports.scheduleForm.recipientsLabel', {
              defaultMessage: 'Recipients',
            })}
            helpText={i18n.translate(
              'xpack.digitalExperience.reports.scheduleForm.recipientsHelp',
              { defaultMessage: 'Enter email addresses and press Enter after each.' }
            )}
            isInvalid={Boolean(recipientsValidationError)}
            error={recipientsValidationError}
            fullWidth
          >
            <EuiComboBox
              fullWidth
              placeholder={i18n.translate(
                'xpack.digitalExperience.reports.scheduleForm.recipientsPlaceholder',
                { defaultMessage: 'name@example.com' }
              )}
              options={recipients.map((email) => ({ label: email }))}
              selectedOptions={recipients.map((email) => ({ label: email }))}
              onChange={(selected) => {
                setRecipientError(undefined);
                setRecipients(selected.map(({ label }) => label));
              }}
              onSearchChange={(searchValue) => setRecipientInput(searchValue)}
              onCreateOption={handleCreateRecipient}
              isInvalid={Boolean(recipientsValidationError)}
              data-test-subj="digitalExperienceScheduleReportRecipients"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiFormRow fullWidth>
            <EuiSwitch
              label={i18n.translate('xpack.digitalExperience.reports.scheduleForm.enabledLabel', {
                defaultMessage: 'Enable schedule',
              })}
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              data-test-subj="digitalExperienceScheduleReportEnabled"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="digitalExperienceScheduleReportFlyoutCancelButton"
              iconType="cross"
              onClick={onClose}
              flush="left"
            >
              {i18n.translate('xpack.digitalExperience.reports.scheduleForm.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              form={formId}
              fill
              isLoading={isSaving}
              disabled={isLoadingConnectors || emailConnectors.length === 0}
              data-test-subj="digitalExperienceScheduleReportSave"
            >
              {isEditing
                ? i18n.translate('xpack.digitalExperience.reports.scheduleForm.saveChanges', {
                    defaultMessage: 'Save changes',
                  })
                : i18n.translate('xpack.digitalExperience.reports.scheduleForm.createAction', {
                    defaultMessage: 'Schedule report',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
