/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAbortableAsync } from '@kbn/react-hooks';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import {
  SESSIONS_MAX_CONCURRENCY,
  timeValueSeconds,
  type SessionsSettings,
  type SessionsSettingsResponse,
} from '../../../../common/sessions';
import { LoadErrorPrompt } from '../../../components/load_error_prompt';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import { useApiClient } from '../../../hooks/use_api_client';
import { httpErrorMessage } from '../../../utils/http_error_message';

/** The frequencies offered, with kibana.yml's and the current one when they differ. */
const FREQUENCY_CHOICES = ['30s', '1m', '2m', '5m', '15m', '1h'] as const;

const CONFIG_KEY = 'xpack.digital_experience.sessions';

const TITLE = i18n.translate('xpack.digitalExperience.sessions.settings.title', {
  defaultMessage: 'Session summaries settings',
});

const CANCEL_LABEL = i18n.translate('xpack.digitalExperience.sessions.settings.cancel', {
  defaultMessage: 'Cancel',
});

const withDefault = (label: string): string =>
  i18n.translate('xpack.digitalExperience.sessions.settings.defaultOption', {
    defaultMessage: '{label} (default)',
    values: { label },
  });

/** How often a frequency runs, e.g. "Every 5 minutes". */
export const frequencyLabel = (frequency: string): string => {
  const seconds = timeValueSeconds(frequency) ?? 0;
  if (seconds > 0 && seconds % 3600 === 0) {
    return i18n.translate('xpack.digitalExperience.sessions.settings.frequencyHours', {
      defaultMessage: '{hours, plural, one {Every hour} other {Every # hours}}',
      values: { hours: seconds / 3600 },
    });
  }
  if (seconds > 0 && seconds % 60 === 0) {
    return i18n.translate('xpack.digitalExperience.sessions.settings.frequencyMinutes', {
      defaultMessage: '{minutes, plural, one {Every minute} other {Every # minutes}}',
      values: { minutes: seconds / 60 },
    });
  }
  return i18n.translate('xpack.digitalExperience.sessions.settings.frequencySeconds', {
    defaultMessage: '{seconds, plural, one {Every second} other {Every # seconds}}',
    values: { seconds },
  });
};

const sameFrequency = (a: string, b: string): boolean =>
  timeValueSeconds(a) === timeValueSeconds(b);

/**
 * The frequencies to pick from, shortest first, one per duration: the usual ones, the current one
 * and kibana.yml's, written as kibana.yml writes it.
 */
const frequencyOptions = ({ settings, defaults }: SessionsSettingsResponse) => {
  const bySeconds = new Map<number, string>();
  [...FREQUENCY_CHOICES, settings.frequency, defaults.frequency].forEach((value) =>
    bySeconds.set(timeValueSeconds(value) ?? 0, value)
  );
  return [...bySeconds.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, value]) => ({
      value,
      text: sameFrequency(value, defaults.frequency)
        ? withDefault(frequencyLabel(value))
        : frequencyLabel(value),
    }));
};

const concurrencyOptions = ({ defaults }: SessionsSettingsResponse) =>
  Array.from({ length: SESSIONS_MAX_CONCURRENCY }, (_, index) => {
    const queries = index + 1;
    const label = i18n.translate('xpack.digitalExperience.sessions.settings.concurrencyOption', {
      defaultMessage: '{queries, plural, one {# query at a time} other {# queries at a time}}',
      values: { queries },
    });
    return {
      value: String(queries),
      text: queries === defaults.concurrency ? withDefault(label) : label,
    };
  });

/** What to save: kibana.yml's settings are left out, so they keep following kibana.yml. */
const toSavedSettings = (
  { frequency, concurrency }: SessionsSettings,
  defaults: SessionsSettings
): Partial<SessionsSettings> => ({
  ...(sameFrequency(frequency, defaults.frequency) ? {} : { frequency }),
  ...(concurrency === defaults.concurrency ? {} : { concurrency }),
});

const CancelButton = ({ onClose }: { onClose: () => void }) => (
  <EuiButtonEmpty
    onClick={onClose}
    data-test-subj="digitalExperienceSessionsSettingsCancel"
    {...getEbtProps({
      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CANCEL_SESSIONS_SETTINGS,
      element: SESSIONS_EBT_ELEMENTS.SETTINGS_CANCEL,
    })}
  >
    {CANCEL_LABEL}
  </EuiButtonEmpty>
);

function SessionsSettingsForm({
  loaded,
  onClose,
  onSaved,
}: {
  loaded: SessionsSettingsResponse;
  onClose: () => void;
  onSaved: (response: SessionsSettingsResponse) => void;
}) {
  const apiClient = useApiClient();
  const { settings, defaults } = loaded;
  const options = frequencyOptions(loaded);
  // The option of a frequency, which may be written another way, e.g. 60s for 1m.
  const asOption = ({ frequency, concurrency }: SessionsSettings): SessionsSettings => ({
    frequency: options.find(({ value }) => sameFrequency(value, frequency))?.value ?? frequency,
    concurrency,
  });
  const [draft, setDraft] = useState<SessionsSettings>(() => asOption(settings));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error>();
  const isDirty =
    !sameFrequency(draft.frequency, settings.frequency) ||
    draft.concurrency !== settings.concurrency;
  const isDefault =
    sameFrequency(draft.frequency, defaults.frequency) &&
    draft.concurrency === defaults.concurrency;

  const save = async () => {
    setSaving(true);
    setSaveError(undefined);
    try {
      onSaved(
        await apiClient.fetch('PUT /internal/digital_experience/sessions/settings', {
          params: { body: toSavedSettings(draft, defaults) },
        })
      );
    } catch (error) {
      setSaveError(error);
      setSaving(false);
    }
  };

  return (
    <>
      <EuiFlyoutBody>
        <KbnInfoCallout
          size="s"
          title={i18n.translate('xpack.digitalExperience.sessions.settings.scopeTitle', {
            defaultMessage: 'Applies to every space',
          })}
          text={
            <FormattedMessage
              id="xpack.digitalExperience.sessions.settings.scopeDescription"
              defaultMessage="Saved settings override {configKey} in kibana.yml, which sets the defaults. They apply from the next run of the task that builds the summaries."
              values={{ configKey: <EuiCode>{CONFIG_KEY}</EuiCode> }}
            />
          }
        />
        <EuiSpacer size="l" />
        {saveError && (
          <>
            <KbnDangerCallout
              data-test-subj="digitalExperienceSessionsSettingsSaveError"
              announceOnMount
              size="s"
              title={i18n.translate('xpack.digitalExperience.sessions.settings.saveErrorTitle', {
                defaultMessage: 'Could not save the settings',
              })}
              text={httpErrorMessage(saveError)}
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiForm component="form" onSubmit={(event) => event.preventDefault()} fullWidth>
          <EuiFormRow
            label={i18n.translate('xpack.digitalExperience.sessions.settings.frequencyLabel', {
              defaultMessage: 'Update frequency',
            })}
            helpText={i18n.translate('xpack.digitalExperience.sessions.settings.frequencyHelp', {
              defaultMessage:
                'How often sessions with new events are summarized again. Each run rebuilds every active session, so a longer interval is cheaper, but the sessions list is that much further behind.',
            })}
          >
            <EuiSelect
              data-test-subj="digitalExperienceSessionsSettingsFrequency"
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CHANGE_SESSIONS_SETTING,
                element: SESSIONS_EBT_ELEMENTS.SETTINGS_FREQUENCY,
              })}
              options={options}
              value={draft.frequency}
              onChange={(event) => setDraft({ ...draft, frequency: event.target.value })}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.digitalExperience.sessions.settings.concurrencyLabel', {
              defaultMessage: 'Summary queries at once',
            })}
            helpText={i18n.translate('xpack.digitalExperience.sessions.settings.concurrencyHelp', {
              defaultMessage:
                'Each query summarizes up to 5,000 sessions. More at once finish busy runs sooner, for more Elasticsearch CPU and memory and about 50 MB more Kibana memory each. With about 300,000 changed sessions a minute, 4 instead of 2 cut a run from about 106 to 77 seconds.',
            })}
          >
            <EuiSelect
              data-test-subj="digitalExperienceSessionsSettingsConcurrency"
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CHANGE_SESSIONS_SETTING,
                element: SESSIONS_EBT_ELEMENTS.SETTINGS_CONCURRENCY,
              })}
              options={concurrencyOptions(loaded)}
              value={String(draft.concurrency)}
              onChange={(event) => setDraft({ ...draft, concurrency: Number(event.target.value) })}
            />
          </EuiFormRow>
        </EuiForm>
        <EuiSpacer size="m" />
        <EuiButtonEmpty
          size="s"
          flush="left"
          iconType="refresh"
          isDisabled={isDefault}
          onClick={() => setDraft(asOption(defaults))}
          data-test-subj="digitalExperienceSessionsSettingsUseDefaults"
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.RESET_SESSIONS_SETTINGS,
            element: SESSIONS_EBT_ELEMENTS.SETTINGS_DEFAULTS,
          })}
        >
          {i18n.translate('xpack.digitalExperience.sessions.settings.useDefaults', {
            defaultMessage: 'Use kibana.yml defaults',
          })}
        </EuiButtonEmpty>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <CancelButton onClose={onClose} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={!isDirty}
              isLoading={saving}
              onClick={save}
              data-test-subj="digitalExperienceSessionsSettingsSave"
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SAVE_SESSIONS_SETTINGS,
                element: SESSIONS_EBT_ELEMENTS.SETTINGS_SAVE,
              })}
            >
              {i18n.translate('xpack.digitalExperience.sessions.settings.save', {
                defaultMessage: 'Save settings',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}

/** How often the session summaries are built, and with how many queries at once. */
export function SessionsSettingsFlyout({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (response: SessionsSettingsResponse) => void;
}) {
  const apiClient = useApiClient();
  const titleId = useGeneratedHtmlId({ prefix: 'digitalExperienceSessionsSettings' });
  const {
    value: loaded,
    error,
    refresh,
  } = useAbortableAsync(
    ({ signal }) =>
      apiClient.fetch('GET /internal/digital_experience/sessions/settings', { signal }),
    [apiClient]
  );

  const renderBody = () => {
    if (loaded) {
      return <SessionsSettingsForm loaded={loaded} onClose={onClose} onSaved={onSaved} />;
    }
    return (
      <>
        <EuiFlyoutBody>
          {error ? (
            <LoadErrorPrompt
              data-test-subj="digitalExperienceSessionsSettingsError"
              retryDataTestSubj="digitalExperienceSessionsSettingsRetry"
              retryEbtElement={SESSIONS_EBT_ELEMENTS.SETTINGS_RETRY}
              title={i18n.translate('xpack.digitalExperience.sessions.settings.loadErrorTitle', {
                defaultMessage: 'Could not load the settings',
              })}
              error={error}
              onRetry={refresh}
            />
          ) : (
            <EuiSkeletonText
              lines={6}
              isLoading
              data-test-subj="digitalExperienceSessionsSettingsLoading"
            />
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <CancelButton onClose={onClose} />
        </EuiFlyoutFooter>
      </>
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      ownFocus
      aria-labelledby={titleId}
      data-test-subj="digitalExperienceSessionsSettingsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {renderBody()}
    </EuiFlyout>
  );
}
