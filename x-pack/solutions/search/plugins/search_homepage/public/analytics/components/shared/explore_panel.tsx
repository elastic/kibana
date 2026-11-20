/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AnalyticsAppApiKeyResult } from '../../../../common/analytics_app_api_key';
import { useAnalyticsPreferences } from '../../hooks/use_analytics_preferences';
import type { SourceGenerationResult } from '../../hooks/use_source_generation';
import { UNAVAILABLE_SOURCE_GENERATION } from '../../hooks/use_source_generation';
import { getStarterQueryTimeField } from '../../query_snippets';
import { getInferredUseCaseNote, resolveSourceRoles } from '../../source_field_roles';
import { getSampleUseCase, getSourceStarterQueries } from '../../source_queries';
import type { AnalyticsEventSource, AnalyticsLinks, AnalyticsStarterQuery } from '../../types';
import { getExploreSourceAgentPrompt } from './event_source_utils';
import { GenerationStatus } from './generation_status';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';
import { reservedNote, sourcePicker } from './shared_styles';
import { StarterQueryList } from './starter_query_list';
import { UseInAppFlyout } from './use_in_app_flyout';
import { useStarterQueryUpgrade } from './use_starter_query_upgrade';

/** The most questions a list can hold, built-in or generated. */
const MAX_QUERIES = 5;
/** Used when the list holds no collapsed question to measure. */
const COLLAPSED_QUERY_SIZE = 46;

interface ExplorePanelProps {
  page: AnalyticsPageId;
  headingElement: 'h2' | 'h3';
  /** Largest first; the picker is only shown when there is more than one. */
  sources: readonly AnalyticsEventSource[];
  /** All sources in the cluster, which can be more than the ones offered in the picker. */
  totalSources: number;
  selectedSource: AnalyticsEventSource | undefined;
  onSelectSource: (name: string) => void;
  /** Whether to offer the agent as another way to explore, where the agent is available. */
  showAgentEntry: boolean;
  links: Pick<AnalyticsLinks, 'canUseDiscover' | 'canOpenAgentChat' | 'openDiscover' | 'askAgent'>;
  /** Questions a model wrote for the selected source, which take the built-in ones' place. */
  generation?: SourceGenerationResult;
  /** Whether exploring is the main action of the view the panel sits in. */
  isPrimary?: boolean;
}

/** The explore task: starter queries for one of the user's own event sources. */
export const ExplorePanel = ({
  page,
  headingElement: Heading,
  sources,
  totalSources,
  selectedSource,
  onSelectSource,
  showAgentEntry,
  links,
  generation = UNAVAILABLE_SOURCE_GENERATION,
  isPrimary = true,
}: ExplorePanelProps): React.JSX.Element => {
  const { selectedUseCaseId } = useAnalyticsPreferences();
  const upgrade = useStarterQueryUpgrade(selectedSource?.name, generation);
  const builtInQueries = useMemo(
    () => (selectedSource ? getSourceStarterQueries(selectedSource, selectedUseCaseId) : []),
    [selectedSource, selectedUseCaseId]
  );
  const inferredUseCaseNote = useMemo(() => {
    if (selectedSource === undefined || getSampleUseCase(selectedSource) !== undefined) {
      return undefined;
    }
    const { useCaseId, isUseCaseInferred } = resolveSourceRoles({
      source: selectedSource,
      selectedUseCaseId,
    });

    return useCaseId !== undefined && isUseCaseInferred
      ? getInferredUseCaseNote(useCaseId)
      : undefined;
  }, [selectedSource, selectedUseCaseId]);
  const queries = upgrade.shown?.queries ?? builtInQueries;

  const [useInApp, setUseInApp] = useState<{
    query: AnalyticsStarterQuery;
    sourceName: string;
    timeField: string | undefined;
  }>();
  const useInAppOpenerRef = useRef<HTMLElement | null>(null);
  // Held in memory only: the keys are gone when the page is left or reloaded.
  const [appApiKeys, setAppApiKeys] = useState<Readonly<Record<string, AnalyticsAppApiKeyResult>>>(
    {}
  );
  const closeUseInApp = useCallback((): void => {
    setUseInApp(undefined);
    // The opener is gone when the list of queries was replaced while the flyout was open.
    if (useInAppOpenerRef.current?.isConnected) {
      useInAppOpenerRef.current.focus();
    }
    useInAppOpenerRef.current = null;
  }, []);

  // While generated questions may still arrive, the list keeps room for as many as can come, so
  // that nothing under it moves when they take the built-in ones' place.
  const hasStableLayout = generation.status !== 'unavailable';
  const listRef = useRef<HTMLDivElement>(null);
  const [reserved, setReserved] = useState<{ sourceName: string; blockSize: number }>();
  const sourceName = selectedSource?.name;
  const queriesCount = queries.length;
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!hasStableLayout || list === null || sourceName === undefined) {
      return;
    }
    setReserved((current) => {
      if (current?.sourceName === sourceName) {
        return current;
      }
      const collapsedQuery = list.querySelector('[aria-expanded="false"]');
      const { rowGap } = getComputedStyle(list.firstElementChild ?? list);
      const querySize =
        (collapsedQuery?.getBoundingClientRect().height ?? COLLAPSED_QUERY_SIZE) +
        (Number.parseFloat(rowGap) || 0);

      return {
        sourceName,
        blockSize:
          list.getBoundingClientRect().height + Math.max(0, MAX_QUERIES - queriesCount) * querySize,
      };
    });
  }, [hasStableLayout, queriesCount, sourceName]);

  if (selectedSource === undefined) {
    return (
      <EuiPanel hasBorder paddingSize="l" data-test-subj={getPageTestSubj(page, 'ExploreEmpty')}>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.searchHomepage.analytics.explorePanel.noSources', {
              defaultMessage:
                'There are no events to explore yet. Connect a source or install the sample events first.',
            })}
          </p>
        </EuiText>
      </EuiPanel>
    );
  }

  const pickerLabel = i18n.translate('xpack.searchHomepage.analytics.explorePanel.pickerLabel', {
    defaultMessage: 'Event source to explore',
  });
  const sampleLabel = i18n.translate('xpack.searchHomepage.analytics.explorePanel.sampleBadge', {
    defaultMessage: 'Sample',
  });
  const hiddenSourcesCount = totalSources - sources.length;

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj={getPageTestSubj(page, 'ExplorePanel')}>
      <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween" wrap>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <Heading data-test-subj={getPageTestSubj(page, 'ExploreTitle')}>
                  {i18n.translate('xpack.searchHomepage.analytics.explorePanel.title', {
                    defaultMessage: 'Explore {sourceName}',
                    values: { sourceName: selectedSource.name },
                  })}
                </Heading>
              </EuiTitle>
            </EuiFlexItem>
            {selectedSource.isSampleData && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj={getPageTestSubj(page, 'ExploreSample')}>
                  {sampleLabel}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {sources.length > 1 && (
          <EuiFlexItem grow={false} css={sourcePicker}>
            <EuiSelect
              compressed
              fullWidth
              aria-label={pickerLabel}
              value={selectedSource.name}
              onChange={({ target: { value } }) => onSelectSource(value)}
              options={sources.map(({ name, isSampleData }) => ({
                value: name,
                text: isSampleData ? `${name} (${sampleLabel})` : name,
              }))}
              data-test-subj={getPageTestSubj(page, 'ExploreSourcePicker')}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {upgrade.shown?.summary ? (
        <EuiText
          size="xs"
          color="subdued"
          css={reservedNote}
          data-test-subj={getPageTestSubj(page, 'ExploreSummary')}
        >
          <p>{upgrade.shown.summary}</p>
        </EuiText>
      ) : (
        (inferredUseCaseNote !== undefined || hasStableLayout) && (
          <EuiText
            size="xs"
            color="subdued"
            {...(hasStableLayout && { css: reservedNote })}
            {...(inferredUseCaseNote !== undefined && {
              'data-test-subj': getPageTestSubj(page, 'ExploreUseCaseNote'),
            })}
          >
            <p>{inferredUseCaseNote}</p>
          </EuiText>
        )
      )}
      {hiddenSourcesCount > 0 && (
        <EuiText size="xs" color="subdued" data-test-subj={getPageTestSubj(page, 'ExploreMore')}>
          <p>
            {i18n.translate('xpack.searchHomepage.analytics.explorePanel.moreSources', {
              defaultMessage:
                'Showing your {shownCount} largest sources. {count, plural, one {# more is} other {# more are}} available in Discover.',
              values: { shownCount: sources.length, count: hiddenSourcesCount },
            })}
          </p>
        </EuiText>
      )}
      <EuiSpacer size="m" />
      {queries.length > 0 ? (
        <div
          ref={listRef}
          style={
            hasStableLayout && reserved?.sourceName === selectedSource.name
              ? { minBlockSize: reserved.blockSize }
              : undefined
          }
          onMouseEnter={() => upgrade.onPresenceChange(true)}
          onMouseLeave={() => upgrade.onPresenceChange(false)}
          onFocus={() => upgrade.onPresenceChange(true)}
          onBlur={() => upgrade.onPresenceChange(false)}
          data-test-subj={getPageTestSubj(page, 'ExploreQueries')}
        >
          <StarterQueryList
            key={`${selectedSource.name}:${upgrade.shown?.generatedAt ?? 'builtIn'}`}
            page={page}
            queries={queries}
            canUseDiscover={links.canUseDiscover}
            onOpenQuery={({ esql }) => links.openDiscover(esql)}
            onUseInApp={(query, opener) => {
              useInAppOpenerRef.current = opener;
              setUseInApp({
                query,
                sourceName: selectedSource.name,
                timeField: getStarterQueryTimeField(selectedSource),
              });
            }}
            isPrimary={isPrimary}
            onInteract={upgrade.onInteract}
            hasStableLayout={hasStableLayout}
          />
        </div>
      ) : (
        <EuiToolTip
          content={
            links.canUseDiscover
              ? undefined
              : i18n.translate('xpack.searchHomepage.analytics.explorePanel.missingDiscover', {
                  defaultMessage: 'You need access to Discover to explore your events.',
                })
          }
        >
          <EuiButton
            fill={isPrimary}
            iconType="discoverApp"
            onClick={() => links.openDiscover()}
            isDisabled={!links.canUseDiscover}
            hasAriaDisabled
            data-test-subj={getPageTestSubj(page, 'ExploreOpenDiscover')}
            data-telemetry-id={getPageTelemetryId(page, 'exploreOpenDiscover')}
          >
            {i18n.translate('xpack.searchHomepage.analytics.explorePanel.openDiscoverButton', {
              defaultMessage: 'Open Discover',
            })}
          </EuiButton>
        </EuiToolTip>
      )}
      {hasStableLayout && (
        <GenerationStatus page={page} generation={generation} upgrade={upgrade} />
      )}
      {showAgentEntry && links.canOpenAgentChat && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="s"
            flush="left"
            iconType="sparkles"
            onClick={() => links.askAgent(getExploreSourceAgentPrompt(selectedSource))}
            data-test-subj={getPageTestSubj(page, 'ExploreAskAgent')}
            data-telemetry-id={getPageTelemetryId(page, 'exploreAskAgent')}
          >
            {i18n.translate('xpack.searchHomepage.analytics.explorePanel.askAgentButton', {
              defaultMessage: 'Or ask the agent to explore these events',
            })}
          </EuiButtonEmpty>
        </>
      )}
      {useInApp !== undefined && (
        <UseInAppFlyout
          query={useInApp.query}
          sourceName={useInApp.sourceName}
          timeField={useInApp.timeField}
          apiKey={appApiKeys[useInApp.sourceName]}
          onApiKeyCreated={(apiKey) =>
            setAppApiKeys((keys) => ({ ...keys, [useInApp.sourceName]: apiKey }))
          }
          onClose={closeUseInApp}
        />
      )}
    </EuiPanel>
  );
};
