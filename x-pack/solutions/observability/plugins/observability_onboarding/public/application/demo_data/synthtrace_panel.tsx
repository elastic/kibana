/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiProgress,
  EuiSelectable,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import type { SynthtraceConnectionOverride, SynthtraceRunPhase } from './api';
import { runSynthtraceStreaming } from './api';
import { DATA_TYPE_META } from './data_types';
import {
  buildSynthtraceCommand,
  deriveDefaultConnectionSettings,
  SYNTHTRACE_SCENARIOS,
  type SynthtraceConnectionSettings,
} from './synthtrace_catalog';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  /** Whether the dev-only synthtrace runner endpoint is available. */
  canRunInBrowser: boolean;
}

const DEFAULT_FROM = 'now-1w';
const DEFAULT_TO = 'now';
// In-browser runs execute in the Kibana server process and target TSDB metrics
// streams with a ~2h writable window, so they ingest a short recent window. The
// copyable CLI command keeps the richer default range.
const BROWSER_RUN_FROM = 'now-1h';

const PHASE_LABELS: Record<SynthtraceRunPhase, string> = {
  installing_packages: i18n.translate(
    'xpack.observability_onboarding.demoData.synthtrace.phase.packages',
    { defaultMessage: 'Installing integration packages…' }
  ),
  generating: i18n.translate('xpack.observability_onboarding.demoData.synthtrace.phase.generate', {
    defaultMessage: 'Generating events…',
  }),
  indexing: i18n.translate('xpack.observability_onboarding.demoData.synthtrace.phase.index', {
    defaultMessage: 'Indexing events…',
  }),
};

const toConnectionOverride = (
  connection: SynthtraceConnectionSettings
): SynthtraceConnectionOverride => ({
  esUrl: connection.esUrl,
  kibanaUrl: connection.kibanaUrl,
  username: connection.username || undefined,
  password: connection.password || undefined,
  apiKey: connection.apiKey || undefined,
});

export const SynthtracePanel: React.FC<Props> = ({ http, notifications, canRunInBrowser }) => {
  const [selectedId, setSelectedId] = useState<string>(SYNTHTRACE_SCENARIOS[0].id);
  const [live, setLive] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runPhase, setRunPhase] = useState<SynthtraceRunPhase | undefined>();
  const [runningEventsIndexed, setRunningEventsIndexed] = useState(0);
  const [lastRunEventsIndexed, setLastRunEventsIndexed] = useState<number | undefined>();
  const [connection, setConnection] = useState<SynthtraceConnectionSettings>(() =>
    deriveDefaultConnectionSettings()
  );

  const selectedScenario = useMemo(
    () => SYNTHTRACE_SCENARIOS.find((scenario) => scenario.id === selectedId),
    [selectedId]
  );

  const canRunSelectedInBrowser = canRunInBrowser && selectedScenario?.browserRunnable !== false;

  const options: EuiSelectableOption[] = SYNTHTRACE_SCENARIOS.map((scenario) => ({
    label: scenario.title,
    key: scenario.id,
    checked: scenario.id === selectedId ? 'on' : undefined,
  }));

  const cliCommand = selectedScenario
    ? buildSynthtraceCommand(selectedScenario.id, {
        live,
        from: DEFAULT_FROM,
        to: DEFAULT_TO,
        connection,
      })
    : '';

  const updateConnection = (patch: Partial<SynthtraceConnectionSettings>): void => {
    setConnection((current) => ({ ...current, ...patch }));
  };

  const onRun = async () => {
    if (!selectedScenario) {
      return;
    }

    setIsRunning(true);
    setLastRunEventsIndexed(undefined);
    setRunPhase(undefined);
    setRunningEventsIndexed(0);

    try {
      const response = await runSynthtraceStreaming(
        http,
        {
          scenarioId: selectedScenario.id,
          from: BROWSER_RUN_FROM,
          to: DEFAULT_TO,
          connection: toConnectionOverride(connection),
        },
        (event) => {
          if (event.type === 'phase') {
            setRunPhase(event.phase);
          } else if (event.type === 'progress') {
            setRunningEventsIndexed(event.eventsIndexed);
          }
        }
      );
      setLastRunEventsIndexed(response.eventsIndexed);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.observability_onboarding.demoData.synthtrace.successToast', {
          defaultMessage: 'Indexed {count} events for "{scenario}".',
          values: { count: response.eventsIndexed, scenario: selectedScenario.title },
        })
      );
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.observability_onboarding.demoData.synthtrace.errorToast', {
          defaultMessage: 'Could not run the scenario.',
        }),
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={1}>
        <EuiSelectable
          aria-label={i18n.translate(
            'xpack.observability_onboarding.demoData.synthtrace.selectableAriaLabel',
            { defaultMessage: 'Select a synthtrace scenario' }
          )}
          options={options}
          singleSelection="always"
          listProps={{ bordered: true }}
          onChange={(newOptions) => {
            const checked = newOptions.find((option) => option.checked === 'on');
            if (checked?.key) {
              setSelectedId(checked.key);
            }
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        {selectedScenario && (
          <EuiPanel hasShadow={false} hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h4>{selectedScenario.title}</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>{selectedScenario.description}</p>
            </EuiText>

            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="s" wrap responsive={false}>
              {selectedScenario.dataTypes.map((dataType) => {
                const meta = DATA_TYPE_META[dataType];
                return (
                  <EuiFlexItem grow={false} key={dataType}>
                    <EuiBadge color="hollow" iconType={meta.iconType}>
                      {meta.label}
                    </EuiBadge>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>

            <EuiHorizontalRule margin="m" />

            <EuiAccordion
              id="observabilityOnboardingDemoDataSynthtraceConnection"
              buttonContent={
                <EuiText size="s">
                  <strong>
                    <FormattedMessage
                      id="xpack.observability_onboarding.demoData.synthtrace.connectionTitle"
                      defaultMessage="Connection settings"
                    />
                  </strong>
                </EuiText>
              }
              paddingSize="s"
              initialIsOpen={false}
            >
              <EuiForm component="div">
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.observability_onboarding.demoData.synthtrace.esUrlLabel',
                    { defaultMessage: 'Elasticsearch URL' }
                  )}
                  fullWidth
                >
                  <EuiFieldText
                    data-test-subj="observabilityOnboardingDemoDataSynthtraceEsUrl"
                    value={connection.esUrl}
                    onChange={(event) => updateConnection({ esUrl: event.target.value })}
                    fullWidth
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.observability_onboarding.demoData.synthtrace.kibanaUrlLabel',
                    { defaultMessage: 'Kibana URL' }
                  )}
                  fullWidth
                >
                  <EuiFieldText
                    data-test-subj="observabilityOnboardingDemoDataSynthtraceKibanaUrl"
                    value={connection.kibanaUrl}
                    onChange={(event) => updateConnection({ kibanaUrl: event.target.value })}
                    fullWidth
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem>
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observability_onboarding.demoData.synthtrace.usernameLabel',
                        { defaultMessage: 'Username' }
                      )}
                      fullWidth
                    >
                      <EuiFieldText
                        data-test-subj="observabilityOnboardingDemoDataSynthtraceUsername"
                        value={connection.username}
                        onChange={(event) => updateConnection({ username: event.target.value })}
                        fullWidth
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observability_onboarding.demoData.synthtrace.passwordLabel',
                        { defaultMessage: 'Password' }
                      )}
                      fullWidth
                    >
                      <EuiFieldPassword
                        data-test-subj="observabilityOnboardingDemoDataSynthtracePassword"
                        type="dual"
                        value={connection.password}
                        onChange={(event) => updateConnection({ password: event.target.value })}
                        fullWidth
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.observability_onboarding.demoData.synthtrace.apiKeyLabel',
                    { defaultMessage: 'API key (optional)' }
                  )}
                  helpText={i18n.translate(
                    'xpack.observability_onboarding.demoData.synthtrace.apiKeyHelp',
                    {
                      defaultMessage:
                        'Used for Kibana Fleet package installation when username/password are not set.',
                    }
                  )}
                  fullWidth
                >
                  <EuiFieldText
                    data-test-subj="observabilityOnboardingDemoDataSynthtraceApiKey"
                    value={connection.apiKey ?? ''}
                    onChange={(event) =>
                      updateConnection({ apiKey: event.target.value || undefined })
                    }
                    fullWidth
                  />
                </EuiFormRow>
              </EuiForm>
            </EuiAccordion>

            <EuiHorizontalRule margin="m" />

            <EuiSwitch
              data-test-subj="observabilityOnboardingDemoDataSynthtraceLiveSwitch"
              label={i18n.translate(
                'xpack.observability_onboarding.demoData.synthtrace.liveSwitch',
                { defaultMessage: 'Live mode (continuous ingestion, CLI only)' }
              )}
              checked={live}
              onChange={(event) => setLive(event.target.checked)}
            />

            <EuiSpacer size="s" />

            <EuiCodeBlock language="bash" paddingSize="m" isCopyable fontSize="s">
              {cliCommand}
            </EuiCodeBlock>

            <EuiSpacer size="m" />

            {isRunning && (
              <>
                <EuiProgress size="s" color="accent" />
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  {runPhase
                    ? PHASE_LABELS[runPhase]
                    : i18n.translate(
                        'xpack.observability_onboarding.demoData.synthtrace.phase.starting',
                        { defaultMessage: 'Starting…' }
                      )}
                  {runningEventsIndexed > 0 &&
                    ` ${i18n.translate(
                      'xpack.observability_onboarding.demoData.synthtrace.eventsIndexedCount',
                      {
                        defaultMessage: '({count} events indexed)',
                        values: { count: runningEventsIndexed.toLocaleString() },
                      }
                    )}`}
                </EuiText>
                <EuiSpacer size="m" />
              </>
            )}

            {!isRunning && lastRunEventsIndexed !== undefined && (
              <>
                <EuiCallOut
                  size="s"
                  title={i18n.translate(
                    'xpack.observability_onboarding.demoData.synthtrace.runCompleteTitle',
                    {
                      defaultMessage: 'Last run indexed {count} events.',
                      values: { count: lastRunEventsIndexed },
                    }
                  )}
                  iconType="checkInCircleFilled"
                  color="success"
                />
                <EuiSpacer size="m" />
              </>
            )}

            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={cliCommand}>
                  {(copy) => (
                    <EuiButtonEmpty
                      data-test-subj="observabilityOnboardingDemoDataSynthtraceCopyButton"
                      iconType="copyClipboard"
                      onClick={copy}
                    >
                      <FormattedMessage
                        id="xpack.observability_onboarding.demoData.synthtrace.copyButton"
                        defaultMessage="Copy CLI command"
                      />
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              </EuiFlexItem>
              {canRunInBrowser && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="observabilityOnboardingDemoDataSynthtraceRunButton"
                    fill
                    iconType="play"
                    isLoading={isRunning}
                    disabled={live || !canRunSelectedInBrowser}
                    onClick={onRun}
                  >
                    <FormattedMessage
                      id="xpack.observability_onboarding.demoData.synthtrace.runButton"
                      defaultMessage="Run in browser"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            {!live && canRunSelectedInBrowser && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.observability_onboarding.demoData.synthtrace.browserWindowHint"
                    defaultMessage="In-browser runs ingest the last hour to stay within memory and metrics retention limits. Copy the CLI command for larger time ranges."
                  />
                </EuiText>
              </>
            )}

            {live && canRunInBrowser && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.observability_onboarding.demoData.synthtrace.liveHint"
                    defaultMessage="Live mode can only be run from the terminal. Copy the command above."
                  />
                </EuiText>
              </>
            )}

            {!live && canRunInBrowser && !canRunSelectedInBrowser && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.observability_onboarding.demoData.synthtrace.cliOnlyHint"
                    defaultMessage="This scenario requires a bootstrap step and can only be run from the CLI. Copy the command above."
                  />
                </EuiText>
              </>
            )}
          </EuiPanel>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
