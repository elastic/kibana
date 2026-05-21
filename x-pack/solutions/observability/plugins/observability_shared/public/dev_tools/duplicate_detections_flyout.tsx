/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject, type Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCopy,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DuplicateDetectionEvent } from './duplicate_detections_toast';
import type { DetectorSettings } from './duplicate_detections_settings';
import { DuplicateDetectionsSettingsPanel } from './duplicate_detections_settings_panel';

export interface DuplicateDetectionsFlyoutProps {
  events$: Observable<DuplicateDetectionEvent[]>;
  settings$: Observable<DetectorSettings>;
  /** Optional `detectedAt` to pre-select / highlight when the flyout opens. */
  initialAnchorDetectedAt?: number;
  /** Called when the user clicks the "Clear all" button. */
  onClearAll: () => void;
  /** Called when the user closes the flyout (via button or backdrop). */
  onClose: () => void;
  /** Called when the user toggles or edits any setting. */
  onUpdateSettings: (patch: Partial<DetectorSettings>) => void;
  /** Called when the user clicks "Reset to defaults" in the Settings tab. */
  onResetSettings: () => void;
  /**
   * Called when the user clicks the row-level "Mute endpoint" action. The
   * `pathPrefix` is the path portion (no query string) of the clicked row, so
   * it can be added directly to `settings.ignoredPathPrefixes`.
   */
  onExcludePath: (pathPrefix: string) => void;
  /** Which tab to show on first render. Defaults to the Detections tab. */
  initialTab?: FlyoutTab;
  /**
   * Live stream of `(owners, knownTeams)` from the server-supplied plugin
   * ownership map. Drives the "Scope to my teams" combo box autocomplete in
   * the Settings tab. The flyout works fine without it (the combo box is
   * disabled until at least one known team arrives).
   */
  ownersSnapshot$?: Observable<{ owners: Record<string, string[]>; knownTeams: string[] }>;
  /**
   * Async fetcher that derives the current developer's likely GitHub teams
   * from their `git config user.email` and recent commit history. When
   * provided, the Settings tab renders a "Detect my teams" button; when
   * omitted, that button is hidden.
   */
  onDetectMyTeams?: () => Promise<import('./duplicate_detections_owners').MyTeamsResult>;
}

type FlyoutTab = 'detections' | 'settings';

/**
 * Default snapshot used when no `ownersSnapshot$` is provided (e.g. unit
 * tests or callers that don't wire the owners store). Declared at module
 * scope so React's `useObservable` doesn't see a fresh subject every render.
 */
const EMPTY_OWNERS$ = new BehaviorSubject<{
  owners: Record<string, string[]>;
  knownTeams: string[];
}>({ owners: {}, knownTeams: [] });

/**
 * Deep-dive flyout for the duplicate-request detector. Shows the full ring
 * buffer of detections with filtering, search, and a details pane for the
 * currently-selected row. Open it from the consolidated toast via the
 * "View details" link or programmatically from the singleton manager.
 */
export const DuplicateDetectionsFlyout: React.FC<DuplicateDetectionsFlyoutProps> = ({
  events$,
  settings$,
  initialAnchorDetectedAt,
  onClearAll,
  onClose,
  onUpdateSettings,
  onResetSettings,
  onExcludePath,
  initialTab = 'detections',
  ownersSnapshot$,
  onDetectMyTeams,
}) => {
  const { euiTheme } = useEuiTheme();
  const events = useObservable<DuplicateDetectionEvent[]>(events$, []);
  const [activeTab, setActiveTab] = useState<FlyoutTab>(initialTab);

  const knownSources = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.source);
    return [...set].sort();
  }, [events]);

  const ownersSnapshot = useObservable(ownersSnapshot$ ?? EMPTY_OWNERS$, {
    owners: {},
    knownTeams: [],
  });
  const knownTeams = ownersSnapshot.knownTeams;

  const [search, setSearch] = useState('');
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set());
  const [selectedDetectedAt, setSelectedDetectedAt] = useState<number | null>(
    initialAnchorDetectedAt ?? null
  );

  const visibleEvents = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return events.filter((e) => {
      if (activeSources.size > 0 && !activeSources.has(e.source)) return false;
      if (!lowerSearch) return true;
      return (
        e.path.toLowerCase().includes(lowerSearch) || e.method.toLowerCase().includes(lowerSearch)
      );
    });
  }, [events, search, activeSources]);

  // If the selected event has been pruned or filtered out, fall back to the
  // first visible event so the details pane is never blank when results exist.
  useEffect(() => {
    if (visibleEvents.length === 0) {
      setSelectedDetectedAt(null);
      return;
    }
    if (
      selectedDetectedAt === null ||
      !visibleEvents.some((e) => e.detectedAt === selectedDetectedAt)
    ) {
      setSelectedDetectedAt(visibleEvents[0].detectedAt);
    }
  }, [visibleEvents, selectedDetectedAt]);

  // Auto-scroll the table to the currently-selected row when the flyout first
  // opens (so the user lands on the event they were viewing in the toast).
  const tableRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!tableRef.current || selectedDetectedAt === null) return;
    const row = tableRef.current.querySelector(
      `[data-test-subj="duplicateDetectionsFlyoutRow-${selectedDetectedAt}"]`
    );
    row?.scrollIntoView({ block: 'nearest' });
    // Only run on initial selection to avoid fighting the user's scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected =
    selectedDetectedAt === null
      ? null
      : visibleEvents.find((e) => e.detectedAt === selectedDetectedAt) ?? null;

  const toggleSource = (source: string) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  const columns: Array<EuiBasicTableColumn<DuplicateDetectionEvent>> = [
    {
      field: 'detectedAt',
      name: i18n.translate('xpack.observabilityShared.duplicateRequestDetector.colTime', {
        defaultMessage: 'Time',
      }),
      width: '92px',
      render: (detectedAt: number) => (
        <EuiText size="xs">{new Date(detectedAt).toLocaleTimeString()}</EuiText>
      ),
    },
    {
      field: 'source',
      name: i18n.translate('xpack.observabilityShared.duplicateRequestDetector.colSource', {
        defaultMessage: 'Source',
      }),
      width: '110px',
      render: (source: string) => <EuiBadge color="hollow">{source}</EuiBadge>,
    },
    {
      field: 'method',
      name: i18n.translate('xpack.observabilityShared.duplicateRequestDetector.colMethod', {
        defaultMessage: 'Method',
      }),
      width: '70px',
      render: (method: string) => (
        <EuiText size="xs">
          <strong>{method}</strong>
        </EuiText>
      ),
    },
    {
      field: 'path',
      name: i18n.translate('xpack.observabilityShared.duplicateRequestDetector.colPath', {
        defaultMessage: 'Path',
      }),
      render: (path: string) => (
        <code css={tableCodeStyles(euiTheme)} title={path}>
          {path}
        </code>
      ),
    },
    {
      field: 'count',
      name: i18n.translate('xpack.observabilityShared.duplicateRequestDetector.colCount', {
        defaultMessage: 'Count',
      }),
      width: '60px',
      align: 'right',
      render: (count: number) => (
        <EuiHealth color={count >= 5 ? 'danger' : count >= 3 ? 'warning' : 'subdued'}>
          {count}
        </EuiHealth>
      ),
    },
    {
      field: 'elapsedMs',
      name: i18n.translate('xpack.observabilityShared.duplicateRequestDetector.colWindow', {
        defaultMessage: 'Window',
      }),
      width: '70px',
      align: 'right',
      render: (elapsedMs: number) => (
        <EuiText size="xs" color="subdued">
          {(elapsedMs / 1000).toFixed(elapsedMs >= 1000 ? 1 : 2)}s
        </EuiText>
      ),
    },
    {
      name: i18n.translate('xpack.observabilityShared.duplicateRequestDetector.colActions', {
        defaultMessage: 'Actions',
      }),
      width: '60px',
      align: 'center',
      actions: [
        {
          name: i18n.translate(
            'xpack.observabilityShared.duplicateRequestDetector.muteActionName',
            { defaultMessage: 'Mute endpoint' }
          ),
          description: i18n.translate(
            'xpack.observabilityShared.duplicateRequestDetector.muteActionDescription',
            {
              defaultMessage:
                'Add this endpoint to the excluded path prefixes and purge its existing detections.',
            }
          ),
          icon: 'eyeClosed',
          type: 'icon',
          color: 'danger',
          'data-test-subj': 'duplicateDetectionsFlyoutMuteAction',
          onClick: (item) => {
            const pathOnly = item.path.split('?')[0];
            onExcludePath(pathOnly);
          },
        },
      ],
    },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="duplicateDetectionsFlyoutTitle">
            {i18n.translate('xpack.observabilityShared.duplicateRequestDetector.flyoutTitle', {
              defaultMessage: 'Duplicate network request detections',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.observabilityShared.duplicateRequestDetector.flyoutSubtitle', {
            defaultMessage:
              'Dev-mode observer that flags identical HTTP requests (matched URL, payload, and response) inside a short sliding window.',
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiTabs size="s" bottomBorder={false}>
          <EuiTab
            isSelected={activeTab === 'detections'}
            onClick={() => setActiveTab('detections')}
            data-test-subj="duplicateDetectionsFlyoutTab-detections"
          >
            {i18n.translate('xpack.observabilityShared.duplicateRequestDetector.tabDetections', {
              defaultMessage: 'Detections ({count})',
              values: { count: events.length },
            })}
          </EuiTab>
          <EuiTab
            isSelected={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            data-test-subj="duplicateDetectionsFlyoutTab-settings"
          >
            {i18n.translate('xpack.observabilityShared.duplicateRequestDetector.tabSettings', {
              defaultMessage: 'Settings',
            })}
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {activeTab === 'settings' ? (
          <DuplicateDetectionsSettingsPanel
            settings$={settings$}
            knownSources={knownSources}
            knownTeams={knownTeams}
            onUpdate={onUpdateSettings}
            onReset={onResetSettings}
            onDetectMyTeams={onDetectMyTeams}
          />
        ) : events.length === 0 ? (
          <EuiEmptyPrompt
            iconType="check"
            color="subdued"
            title={
              <h3>
                {i18n.translate(
                  'xpack.observabilityShared.duplicateRequestDetector.flyoutEmptyTitle',
                  { defaultMessage: 'No detections recorded yet' }
                )}
              </h3>
            }
            body={
              <p>
                {i18n.translate(
                  'xpack.observabilityShared.duplicateRequestDetector.flyoutEmptyBody',
                  {
                    defaultMessage:
                      'Duplicate requests will appear here as they are detected. Keep this flyout open while you exercise the page to see live results.',
                  }
                )}
              </p>
            }
          />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false} wrap>
                <EuiFlexItem>
                  <EuiFieldSearch
                    fullWidth
                    incremental
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={i18n.translate(
                      'xpack.observabilityShared.duplicateRequestDetector.searchPlaceholder',
                      { defaultMessage: 'Filter by path or method…' }
                    )}
                    data-test-subj="duplicateDetectionsFlyoutSearch"
                  />
                </EuiFlexItem>
                {knownSources.length > 1 && (
                  <EuiFlexItem grow={false}>
                    <EuiFilterGroup>
                      {knownSources.map((s) => (
                        <EuiFilterButton
                          key={s}
                          hasActiveFilters={activeSources.has(s)}
                          onClick={() => toggleSource(s)}
                          data-test-subj={`duplicateDetectionsFlyoutSourceFilter-${s}`}
                        >
                          {s}
                        </EuiFilterButton>
                      ))}
                    </EuiFilterGroup>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>

            {visibleEvents.length === 0 ? (
              <EuiFlexItem grow={false}>
                <EuiCallOut
                  announceOnMount
                  size="s"
                  iconType="filter"
                  title={i18n.translate(
                    'xpack.observabilityShared.duplicateRequestDetector.noMatchesTitle',
                    { defaultMessage: 'No detections match the current filter' }
                  )}
                />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem grow={false}>
                <div ref={tableRef}>
                  <EuiBasicTable
                    items={visibleEvents}
                    columns={columns}
                    compressed
                    tableLayout="auto"
                    rowProps={(item) => ({
                      'data-test-subj': `duplicateDetectionsFlyoutRow-${item.detectedAt}`,
                      onClick: () => setSelectedDetectedAt(item.detectedAt),
                      style:
                        selectedDetectedAt === item.detectedAt
                          ? { background: euiTheme.colors.lightestShade }
                          : undefined,
                    })}
                    data-test-subj="duplicateDetectionsFlyoutTable"
                  />
                </div>
              </EuiFlexItem>
            )}

            {selected && (
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate(
                      'xpack.observabilityShared.duplicateRequestDetector.detailsTitle',
                      { defaultMessage: 'Detection details' }
                    )}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiDescriptionList
                  type="column"
                  compressed
                  columnWidths={[1, 3]}
                  listItems={[
                    {
                      title: i18n.translate(
                        'xpack.observabilityShared.duplicateRequestDetector.dlSource',
                        { defaultMessage: 'Source plugin' }
                      ),
                      description: <EuiBadge color="warning">{selected.source}</EuiBadge>,
                    },
                    ...(selected.app && selected.app !== selected.source
                      ? [
                          {
                            title: i18n.translate(
                              'xpack.observabilityShared.duplicateRequestDetector.dlApp',
                              { defaultMessage: 'Active app' }
                            ),
                            description: <EuiBadge color="hollow">{selected.app}</EuiBadge>,
                          },
                        ]
                      : []),
                    {
                      title: i18n.translate(
                        'xpack.observabilityShared.duplicateRequestDetector.dlEndpoint',
                        { defaultMessage: 'Endpoint' }
                      ),
                      description: (
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
                          <EuiFlexItem grow={false}>
                            <code css={tableCodeStyles(euiTheme)}>
                              <strong>{selected.method}</strong> {selected.path}
                            </code>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiCopy textToCopy={`${selected.method} ${selected.path}`}>
                              {(copy) => (
                                <EuiButtonEmpty
                                  size="xs"
                                  iconType="copyClipboard"
                                  onClick={copy}
                                  data-test-subj="duplicateDetectionsFlyoutCopy"
                                >
                                  {i18n.translate(
                                    'xpack.observabilityShared.duplicateRequestDetector.copyEndpoint',
                                    { defaultMessage: 'Copy' }
                                  )}
                                </EuiButtonEmpty>
                              )}
                            </EuiCopy>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty
                              size="xs"
                              iconType="logoGithub"
                              href={buildGithubIssueUrl(selected)}
                              target="_blank"
                              data-test-subj="duplicateDetectionsFlyoutReportGithub"
                            >
                              {i18n.translate(
                                'xpack.observabilityShared.duplicateRequestDetector.reportGithubBtn',
                                { defaultMessage: 'Report on GitHub' }
                              )}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      ),
                    },
                    {
                      title: i18n.translate(
                        'xpack.observabilityShared.duplicateRequestDetector.dlCount',
                        { defaultMessage: 'Identical requests' }
                      ),
                      description: <EuiText size="s">{selected.count}</EuiText>,
                    },
                    {
                      title: i18n.translate(
                        'xpack.observabilityShared.duplicateRequestDetector.dlWindow',
                        { defaultMessage: 'Burst window' }
                      ),
                      description: (
                        <EuiText size="s">
                          {(selected.elapsedMs / 1000).toFixed(selected.elapsedMs >= 1000 ? 1 : 2)}s
                        </EuiText>
                      ),
                    },
                    {
                      title: i18n.translate(
                        'xpack.observabilityShared.duplicateRequestDetector.dlDetectedAt',
                        { defaultMessage: 'Detected at' }
                      ),
                      description: (
                        <EuiText size="s">{new Date(selected.detectedAt).toLocaleString()}</EuiText>
                      ),
                    },
                  ]}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onClose}
              data-test-subj="duplicateDetectionsFlyoutClose"
            >
              {i18n.translate('xpack.observabilityShared.duplicateRequestDetector.flyoutCloseBtn', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {activeTab === 'detections' && (
            <EuiFlexItem grow={false}>
              <EuiButton
                color="danger"
                iconType="trash"
                onClick={onClearAll}
                isDisabled={events.length === 0}
                data-test-subj="duplicateDetectionsFlyoutClearAll"
              >
                {i18n.translate(
                  'xpack.observabilityShared.duplicateRequestDetector.flyoutClearAllBtn',
                  { defaultMessage: 'Clear all detections' }
                )}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

const tableCodeStyles = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => css`
  font-family: ${euiTheme.font.familyCode};
  font-size: ${euiTheme.size.m};
  word-break: normal;
  overflow-wrap: anywhere;

  strong {
    color: ${euiTheme.colors.textAccent};
    margin-right: ${euiTheme.size.xs};
  }
`;

/**
 * Build a pre-filled GitHub issue URL for the elastic/kibana repo. The title
 * includes the source plugin and endpoint; the body has a structured table of
 * detection metadata so a triage engineer can act on it without needing to
 * ask follow-up questions.
 */
const buildGithubIssueUrl = (event: DuplicateDetectionEvent): string => {
  const title = `[${event.source}] Duplicate network request to ${event.method} ${
    event.path.split('?')[0]
  }`;
  const detectedAt = new Date(event.detectedAt).toISOString();
  const elapsedSeconds = (event.elapsedMs / 1000).toFixed(event.elapsedMs >= 1000 ? 1 : 2);
  const body = [
    `**Kibana version:** _please fill in_`,
    `**Reported by:** dev-mode duplicate request detector`,
    '',
    '## Detection summary',
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| Source plugin | \`${event.source}\` |`,
    event.app ? `| Active app | \`${event.app}\` |` : '',
    `| Method | \`${event.method}\` |`,
    `| Path | \`${event.path}\` |`,
    `| Identical requests | ${event.count} |`,
    `| Burst window | ${elapsedSeconds}s |`,
    `| Detected at | ${detectedAt} |`,
    '',
    '## Likely cause',
    '',
    'Re-render loops, unmemoized hooks, or misconfigured `useEffect` dependencies typically produce this pattern. See the dev-mode duplicate request detector docs for more.',
    '',
    '## Steps to reproduce',
    '',
    '1. _please fill in_',
  ]
    .filter(Boolean)
    .join('\n');
  const params = new URLSearchParams({ title, body });
  return `https://github.com/elastic/kibana/issues/new?${params.toString()}`;
};
