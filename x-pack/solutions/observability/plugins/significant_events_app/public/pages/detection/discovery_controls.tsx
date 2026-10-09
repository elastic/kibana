/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiRange,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useQueryClient } from '@kbn/react-query';
import { getSeverityLabel } from '@kbn/significant-events-schema';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../../hooks/use_kibana';
import { useEngineSettings, type EngineSettingsPatch } from './use_engine_settings';
import { journey } from './journey_translations';

export const DiscoveryControls = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { core, dependencies } = useKibana();
  const cache = useQueryClient();
  const capabilities = getNightshiftCapabilities(core.application.capabilities.nightshift);
  const canEdit = capabilities.canManage && capabilities.canConfigure;
  const settings = useEngineSettings();
  const id = useGeneratedHtmlId({ prefix: 'discoveryControls' });
  const [limit, setLimit] = useState<number>();
  const [confidence, setConfidence] = useState<number>();
  const [confirm, setConfirm] = useState<EngineSettingsPatch>();
  const [error, setError] = useState('');
  if (!settings.data)
    return settings.isError ? (
      <EuiCallOut announceOnMount title={journey.noEstimate} color="warning" />
    ) : (
      <EuiLoadingSpinner />
    );
  const saved = settings.data;
  const draftLimit = limit ?? saved.dailyDiscoveryLimit;
  const draftConfidence = confidence ?? Math.round(saved.confidenceThreshold * 100);
  const today = new Date().toISOString().slice(0, 10);
  const used = saved.usage[today] ?? 0;
  const maximum = Math.max(1, draftLimit, ...Object.values(saved.usage));
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString(i18n.getLocale(), {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
      count: saved.usage[key],
    };
  });
  const apply = async (): Promise<void> => {
    if (!confirm) return;
    try {
      await settings.save(confirm);
      setConfirm(undefined);
      setLimit(undefined);
      setConfidence(undefined);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
  return (
    <>
      <EuiPanel hasBorder hasShadow={false} paddingSize="l">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>{journey.discoveryUsage}</h2>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              <p>{journey.limitHint}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={saved.discoveryPaused ? 'warning' : 'hollow'}>
              {saved.discoveryPaused ? journey.paused : journey.running}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="significantEventsAppDiscoveryControlsButton"
              size="s"
              isDisabled={!canEdit || settings.isSaving}
              onClick={() => setConfirm({ discoveryPaused: !saved.discoveryPaused })}
            >
              {saved.discoveryPaused ? journey.resumeDiscovery : journey.pauseDiscovery}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiFlexGroup alignItems="baseline" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h3>{used}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              <p>
                / {saved.dailyDiscoveryLimit || journey.unlimited} · {journey.usageUnit} ·{' '}
                {journey.today}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <svg
          viewBox="0 0 760 205"
          role="img"
          aria-label={journey.dailyLimit}
          css={css`
            width: 100%;
            max-height: 250px;
            display: block;
            font-family: ${euiTheme.font.family};
          `}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line
                x1="34"
                x2="748"
                y1={170 - tick * 140}
                y2={170 - tick * 140}
                stroke={euiTheme.colors.borderBasePlain}
                strokeDasharray="3 5"
              />
              <text
                x="26"
                y={174 - tick * 140}
                textAnchor="end"
                fill={euiTheme.colors.textSubdued}
                fontSize="10"
              >
                {Math.round(maximum * tick)}
              </text>
            </g>
          ))}
          {days.map((day, index) => (
            <g key={day.key}>
              <title>
                {day.label}:{' '}
                {day.count === undefined
                  ? journey.notRecorded
                  : `${day.count} ${journey.usageUnit}`}
              </title>
              <rect
                x={45 + index * 50}
                y={day.count === undefined ? 166 : 170 - (day.count / maximum) * 140}
                width="30"
                height={day.count === undefined ? 4 : Math.max(2, (day.count / maximum) * 140)}
                rx="3"
                fill={
                  day.count === undefined
                    ? euiTheme.colors.borderBasePlain
                    : draftLimit > 0 && day.count >= draftLimit
                    ? euiTheme.colors.warning
                    : euiTheme.colors.primary
                }
              />
              {index % 2 === 0 && (
                <text
                  x={60 + index * 50}
                  y="193"
                  textAnchor="middle"
                  fontSize="10"
                  fill={euiTheme.colors.textSubdued}
                >
                  {day.label}
                </text>
              )}
            </g>
          ))}
          {draftLimit > 0 && (
            <>
              <line
                x1="34"
                x2="748"
                y1={170 - (draftLimit / maximum) * 140}
                y2={170 - (draftLimit / maximum) * 140}
                stroke={euiTheme.colors.accent}
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <text
                x="745"
                y={161 - (draftLimit / maximum) * 140}
                textAnchor="end"
                fill={euiTheme.colors.accent}
                fontSize="11"
              >
                {journey.dailyLimit} · {draftLimit}
              </text>
            </>
          )}
        </svg>
        <EuiText size="xs" color="subdued">
          <p>{journey.historyNote}</p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFormRow label={journey.dailyLimit} helpText={journey.zeroUnlimited} fullWidth>
          <EuiRange
            id={`${id}-limit`}
            fullWidth
            min={0}
            max={Math.max(100, saved.dailyDiscoveryLimit)}
            step={1}
            value={draftLimit}
            showInput
            disabled={!canEdit}
            onChange={(event) => setLimit(Number(event.currentTarget.value))}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiButton
          data-test-subj="significantEventsAppDiscoveryControlsButton"
          size="s"
          isDisabled={!canEdit || draftLimit === saved.dailyDiscoveryLimit}
          onClick={() => setConfirm({ dailyDiscoveryLimit: draftLimit })}
        >
          {journey.saveLimit}
        </EuiButton>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="l">
        <EuiTitle size="xs">
          <h2>{journey.confidenceThreshold}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>{journey.confidenceHint}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow label={`${journey.confidenceThreshold} · ${draftConfidence}%`} fullWidth>
          <EuiRange
            id={`${id}-confidence`}
            min={0}
            max={100}
            step={5}
            fullWidth
            showInput
            disabled={!canEdit}
            value={draftConfidence}
            onChange={(event) => setConfidence(Number(event.currentTarget.value))}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiButton
          data-test-subj="significantEventsAppDiscoveryControlsButton"
          size="s"
          isDisabled={!canEdit || draftConfidence === Math.round(saved.confidenceThreshold * 100)}
          onClick={() => setConfirm({ confidenceThreshold: draftConfidence / 100 })}
        >
          {journey.reviewChanges}
        </EuiButton>
      </EuiPanel>
      {Object.keys(saved.severityFeedback ?? {}).length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiPanel hasBorder hasShadow={false} paddingSize="l">
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.significantEventsApp.feedback.saved', {
                  defaultMessage: 'Remembered severity feedback',
                })}
              </h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            {Object.entries(saved.severityFeedback ?? {}).map(([key, feedback]) => (
              <EuiFlexGroup key={key} alignItems="center">
                <EuiFlexItem>
                  <EuiText size="s">
                    <p>
                      <strong>{getSeverityLabel(feedback.severity)}</strong> · {feedback.reason}
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="significantEventsAppDiscoveryControlsForgetFeedbackButton"
                    size="xs"
                    color="danger"
                    isDisabled={!canEdit}
                    onClick={async () => {
                      try {
                        await dependencies.start.significantEvents.significantEventsRepositoryClient.fetch(
                          'DELETE /internal/significant_events/engine_settings/severity_feedback',
                          { signal: null, params: { body: { key } } }
                        );
                        await cache.invalidateQueries({ queryKey: ['detectionEngineSettings'] });
                      } catch (failure) {
                        core.notifications.toasts.addDanger({
                          title: journey.error,
                          text: failure instanceof Error ? failure.message : String(failure),
                        });
                      }
                    }}
                  >
                    {i18n.translate('xpack.significantEventsApp.feedback.forget', {
                      defaultMessage: 'Forget feedback',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
          </EuiPanel>
        </>
      )}
      {confirm && (
        <EuiConfirmModal
          title={journey.reviewChanges}
          titleProps={{ id: `${id}-confirm` }}
          aria-labelledby={`${id}-confirm`}
          onCancel={() => setConfirm(undefined)}
          onConfirm={apply}
          cancelButtonText={journey.cancel}
          confirmButtonText={journey.save}
          isLoading={settings.isSaving}
        >
          <EuiText size="s">
            <p>
              {confirm.dailyDiscoveryLimit !== undefined
                ? confirm.dailyDiscoveryLimit > 0 && used >= confirm.dailyDiscoveryLimit
                  ? journey.limitWillPause
                  : journey.limitWillAllow
                : confirm.discoveryPaused !== undefined
                ? confirm.discoveryPaused
                  ? journey.pauseEffect
                  : journey.resumeEffect
                : journey.thresholdEffect}
            </p>
            <p>{journey.sourcePreserved}</p>
          </EuiText>
          {error && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut announceOnMount color="danger" title={error} />
            </>
          )}
        </EuiConfirmModal>
      )}
    </>
  );
};
