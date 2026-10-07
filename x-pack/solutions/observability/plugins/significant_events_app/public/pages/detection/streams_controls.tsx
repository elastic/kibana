/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiFieldSearch,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiLink,
  EuiToolTip,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS,
} from '@kbn/management-settings-ids';
import { parseIndexPatterns, streamMatchesIndexPatterns } from '@kbn/streams-schema';
import { SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useEvidence } from '../../components/evidence_chain/evidence_context';
import { useKibana } from '../../hooks/use_kibana';
import { useMaintenanceStatus } from '../../hooks/use_significant_events_maintenance';
import { useOnboardingApi } from '../../hooks/use_onboarding_api';
import { useEngineActivity } from './use_engine_activity';
import { useEngineSettings } from './use_engine_settings';
import { journey } from './journey_translations';

export const StreamsControls = ({
  selectedSource,
}: {
  selectedSource?: string;
}): React.ReactElement => {
  const { core, dependencies } = useKibana();
  const { href: evidenceHref, onNavigate } = useEvidence();
  const { euiTheme } = useEuiTheme();
  const cache = useQueryClient();
  const activity = useEngineActivity({ live: true });
  const preferences = useEngineSettings();
  const onboarding = useOnboardingApi();
  const maintenance = useMaintenanceStatus();
  const id = useGeneratedHtmlId({ prefix: 'streamControls' });
  const capabilities = getNightshiftCapabilities(core.application.capabilities.nightshift);
  const canEdit = capabilities.canManage && capabilities.canConfigure;
  const canSavePatterns = canEdit && core.application.capabilities.advancedSettings?.save === true;
  const [patterns, setPatterns] = useState(
    core.settings.client.get<string>(OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS)
  );
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(false);
  const [confirm, setConfirm] = useState<
    { kind: 'patterns' } | { kind: 'learning'; name: string; paused: boolean }
  >();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('FROM logs-*');
  const streams = activity.data?.streams ?? [];
  const pausedStreams = preferences.data?.pausedStreams ?? [];
  const matches = streams.filter(
    (stream) =>
      streamMatchesIndexPatterns(stream.name, parseIndexPatterns(patterns)) ||
      stream.type === 'query'
  );
  const perform = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      await action();
      await cache.invalidateQueries({ queryKey: ['detectionEngineActivity'] });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };
  const ensureRunning = async (): Promise<void> => {
    const repository = dependencies.start.significantEvents.significantEventsRepositoryClient;
    if (!maintenance.data?.featureSettings?.continuousOnboardingEnabled)
      await repository.fetch(
        'PUT /internal/streams/_knowledge_indicators/continuous_ki_extraction/settings',
        { signal: null, params: { body: { continuousKiExtraction: { enabled: true } } } }
      );
    if (!maintenance.data?.featureSettings?.scheduledDiscoveryEnabled)
      await repository.fetch(
        'PUT /internal/streams/_significant_events/scheduled_discovery/settings',
        { signal: null, params: { body: { scheduledDiscovery: { enabled: true } } } }
      );
    await maintenance.refetch();
    setConfigured(true);
  };
  const apply = () =>
    perform(async () => {
      if (confirm?.kind === 'patterns') {
        const saved = await core.settings.client.set(
          OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_INDEX_PATTERNS,
          patterns
        );
        if (!saved) throw new Error(journey.error);
        if (matches.length) await ensureRunning();
      } else if (confirm?.kind === 'learning') {
        await preferences.save({
          pausedStreams: confirm.paused
            ? Array.from(new Set([...pausedStreams, confirm.name]))
            : pausedStreams.filter((stream) => stream !== confirm.name),
        });
      }
      setConfirm(undefined);
    });
  const create = () =>
    perform(async () => {
      if (!editing && streams.some((stream) => stream.name === name.trim()))
        throw new Error(
          i18n.translate('xpack.significantEventsApp.streams.duplicate', {
            defaultMessage:
              'A source with this name already exists. Edit that source or choose a different name.',
          })
        );
      const enabled = await core.settings.client.set(
        OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS,
        true
      );
      if (!enabled) throw new Error(journey.error);
      await dependencies.start.streams.streamsRepositoryClient.fetch(
        'PUT /api/streams/{name}/_query 2023-10-31',
        { signal: null, params: { path: { name: name.trim() }, body: { query: { esql: query } } } }
      );
      setEditing(true);
      await ensureRunning();
      setCreating(false);
      setName('');
      core.notifications.toasts.addSuccess(journey.streamReady);
      await cache.invalidateQueries({ queryKey: ['streamList'] });
    });
  const editorTitle = editing
    ? i18n.translate('xpack.significantEventsApp.streams.editTitle', {
        defaultMessage: 'Edit ES|QL source',
      })
    : journey.customStream;
  const editorForm = (
    <>
      <EuiText size="s" color="subdued">
        <p>{journey.addStreamHint}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow label={journey.streamName} fullWidth>
        <EuiFieldText
          data-test-subj="significantEventsAppStreamsControlsFieldText"
          fullWidth
          value={name}
          maxLength={1000}
          disabled={editing}
          onChange={(event) => setName(event.target.value)}
        />
      </EuiFormRow>
      <EuiFormRow label={journey.streamQuery} fullWidth>
        <EuiTextArea
          data-test-subj="significantEventsAppStreamsControlsTextArea"
          fullWidth
          value={query}
          rows={8}
          onChange={(event) => setQuery(event.target.value)}
        />
      </EuiFormRow>
      {error && <EuiCallOut announceOnMount title={error} color="danger" />}
    </>
  );
  const editorActions = (
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="significantEventsAppStreamsControlsButton"
          onClick={() => setCreating(false)}
        >
          {journey.cancel}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="significantEventsAppStreamsControlsButton"
          fill
          isLoading={busy}
          isDisabled={!name.trim() || !query.trim()}
          onClick={create}
        >
          {editing ? journey.save : journey.createStream}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="l">
      {configured && (
        <>
          <EuiCallOut announceOnMount size="s" color="success" title={journey.streamReady}>
            <EuiButtonEmpty
              data-test-subj="significantEventsAppStreamsControlsChooseWhichEventsAreInvestigatedAutomaticallyButton"
              size="s"
              href={core.application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
                path: '/settings?section=investigations',
              })}
            >
              {i18n.translate('xpack.significantEventsApp.streams.automationNudge', {
                defaultMessage: 'Choose which events are investigated automatically',
              })}
            </EuiButtonEmpty>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      {!selectedSource && (
        <>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>{journey.streamSettings}</h2>
              </EuiTitle>
              <EuiText size="xs" color="subdued">
                <p>{journey.configureHint}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="significantEventsAppStreamsControlsButton"
                size="s"
                iconType="plusCircle"
                isDisabled={!canSavePatterns}
                onClick={() => {
                  setEditing(false);
                  setName('');
                  setQuery('FROM logs-*');
                  setCreating(true);
                }}
              >
                {journey.customStream}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFormRow label={journey.watchedPatterns} fullWidth>
            <EuiTextArea
              data-test-subj="significantEventsAppStreamsControlsTextArea"
              fullWidth
              compressed
              value={patterns}
              rows={2}
              disabled={!canSavePatterns || busy}
              onChange={(event) => setPatterns(event.target.value)}
            />
          </EuiFormRow>
          <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="significantEventsAppStreamsControlsButton"
                size="xs"
                isDisabled={!canSavePatterns}
                onClick={() => setPatterns('logs-*,logs.*')}
              >
                {journey.allLogs}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="significantEventsAppStreamsControlsButton"
                size="xs"
                isDisabled={!canSavePatterns}
                onClick={() => setPatterns('metrics-*,metrics.*')}
              >
                {journey.allMetrics}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.significantEventsApp.journeys.streamMatchCount', {
                  defaultMessage: '{count} sources in scope',
                  values: { count: matches.length },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="significantEventsAppStreamsControlsButton"
                size="s"
                isDisabled={!canSavePatterns || busy}
                onClick={() => setConfirm({ kind: 'patterns' })}
              >
                {journey.savePatterns}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiFieldSearch
            data-test-subj="significantEventsAppStreamsControlsFieldSearch"
            compressed
            fullWidth
            aria-label={journey.streamSearch}
            placeholder={journey.streamSearch}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {(error || activity.isError) && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="danger"
            title={error || journey.engineUnavailable}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {activity.isLoading && <EuiLoadingSpinner />}
      {streams
        .filter((stream) =>
          selectedSource
            ? stream.name === selectedSource
            : stream.name.toLowerCase().includes(search.toLowerCase())
        )
        .map((stream) => {
          const run = activity.data?.runs.find((item) => item.stream === stream.name);
          const paused = pausedStreams.includes(stream.name);
          return (
            <div
              key={stream.name}
              css={css`
                padding: ${euiTheme.size.m} 0;
                border-top: 1px solid ${euiTheme.colors.borderBasePlain};
              `}
            >
              <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
                <EuiFlexItem>
                  <EuiText size="s">
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.significantEventsApp.sources.exploreEvidence',
                        {
                          defaultMessage:
                            'Explore the service, knowledge, rules and detections connected to this source.',
                        }
                      )}
                    >
                      <EuiLink
                        href={evidenceHref({
                          kind: 'source',
                          id: stream.name,
                          stream: stream.name,
                        })}
                        onClick={
                          onNavigate
                            ? (event) => {
                                event.preventDefault();
                                onNavigate({
                                  kind: 'source',
                                  id: stream.name,
                                  stream: stream.name,
                                });
                              }
                            : undefined
                        }
                        data-test-subj="sourceExploreEvidence"
                      >
                        <strong>{stream.name}</strong>
                      </EuiLink>
                    </EuiToolTip>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    <p>{run?.error || stream.description}</p>
                  </EuiText>
                </EuiFlexItem>
                {stream.type === 'query' && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="significantEventsAppStreamsControlsEditQueryButton"
                      size="xs"
                      iconType="pencil"
                      isDisabled={!canSavePatterns || busy}
                      onClick={() =>
                        perform(async () => {
                          const result =
                            await dependencies.start.streams.streamsRepositoryClient.fetch(
                              'GET /api/streams/{name}/_query 2023-10-31',
                              { signal: null, params: { path: { name: stream.name } } }
                            );
                          setName(stream.name);
                          setQuery(result.query.esql);
                          setEditing(true);
                          setCreating(true);
                        })
                      }
                    >
                      {i18n.translate('xpack.significantEventsApp.streams.editQuery', {
                        defaultMessage: 'Edit query',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="significantEventsAppStreamsControlsButton"
                    size="xs"
                    iconType="external"
                    href={core.application.getUrlForApp('streams', {
                      path: `/streams/${encodeURIComponent(stream.name)}`,
                    })}
                  >
                    {journey.viewSource}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={paused || run?.error ? 'warning' : run?.active ? 'primary' : 'hollow'}
                  >
                    {paused
                      ? journey.learningPaused
                      : run?.active
                      ? journey.inProgress
                      : run?.error
                      ? journey.failed
                      : stream.watched
                      ? journey.watching
                      : journey.notWatching}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="significantEventsAppStreamsControlsButton"
                    size="xs"
                    iconType="refresh"
                    isDisabled={!canEdit || busy || paused || run?.active}
                    onClick={() =>
                      perform(async () => {
                        await onboarding.scheduleOnboarding(stream.name);
                      })
                    }
                  >
                    {journey.relearn}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="significantEventsAppStreamsControlsButton"
                    size="xs"
                    isDisabled={!canEdit || busy || !preferences.data}
                    onClick={() =>
                      setConfirm({ kind: 'learning', name: stream.name, paused: !paused })
                    }
                  >
                    {paused ? journey.resumeLearning : journey.pauseLearning}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          );
        })}
      {!activity.isLoading && streams.length === 0 && (
        <EuiCallOut announceOnMount size="s" title={journey.off}>
          <p>{journey.configureHint}</p>
          <EuiButtonEmpty
            data-test-subj="significantEventsAppStreamsControlsAddDataButton"
            href={core.application.getUrlForApp('integrations')}
          >
            {i18n.translate('xpack.significantEventsApp.journeys.addData', {
              defaultMessage: 'Add data',
            })}
          </EuiButtonEmpty>
        </EuiCallOut>
      )}
      {confirm && (
        <EuiConfirmModal
          title={
            confirm.kind === 'patterns'
              ? journey.savePatterns
              : confirm.paused
              ? journey.pauseLearning
              : journey.resumeLearning
          }
          titleProps={{ id: `${id}-confirm` }}
          aria-labelledby={`${id}-confirm`}
          onCancel={() => setConfirm(undefined)}
          onConfirm={apply}
          cancelButtonText={journey.cancel}
          confirmButtonText={journey.save}
          isLoading={busy}
        >
          <EuiText size="s">
            <p>{confirm.kind === 'patterns' ? journey.streamImpact : confirm.name}</p>
            <p>{journey.sourcePreserved}</p>
            {confirm.kind === 'patterns' && (
              <p>{matches.map((stream) => stream.name).join(', ') || journey.off}</p>
            )}
          </EuiText>
          {error && <EuiCallOut announceOnMount title={error} color="danger" />}
        </EuiConfirmModal>
      )}
      {creating &&
        (selectedSource ? (
          <EuiPanel hasBorder hasShadow={false}>
            <EuiTitle size="xs">
              <h3>{editorTitle}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            {editorForm}
            <EuiSpacer size="l" />
            {editorActions}
          </EuiPanel>
        ) : (
          <EuiFlyout
            size="l"
            maxWidth={960}
            onClose={() => setCreating(false)}
            aria-labelledby={`${id}-create`}
            data-test-subj="detectionCreateSourceFlyout"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="m">
                <h2 id={`${id}-create`}>{editorTitle}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>{editorForm}</EuiFlyoutBody>
            <EuiFlyoutFooter>{editorActions}</EuiFlyoutFooter>
          </EuiFlyout>
        ))}
    </EuiPanel>
  );
};
