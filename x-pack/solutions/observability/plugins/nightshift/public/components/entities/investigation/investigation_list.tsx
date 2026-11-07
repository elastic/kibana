/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { notFound } from '@elastic/eui-illustrations';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import type { Severity } from '@kbn/nightshift-investigations-plugin/common';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { i18n } from '@kbn/i18n';
import { NO_INVESTIGATIONS_FOUND_MESSAGE } from '../../../common/messages';
import type {
  InvestigationSectionId,
  InvestigationSectionState,
} from '../../../data/investigations/use_investigation_sections';
import {
  buildInvestigationsPath,
  DEFAULT_INVESTIGATIONS_TIME_RANGE,
  sectionIdToInvestigationsFilters,
} from '../../../data/investigations/investigations_url';
import { useKibana } from '../../../hooks/use_kibana';
import {
  getInvestigationSectionAnchorId,
  InvestigationSection,
  isInvestigationSectionVisible,
  STICKY_HEADER_HEIGHT_VAR,
} from './investigation_section';
import { scrollSectionIntoView } from './scroll_section_into_view';

const NO_INVESTIGATIONS_FOUND_HINT = i18n.translate(
  'xpack.nightshift.investigations.noInvestigationsFoundHint',
  { defaultMessage: 'Try adjusting your time range or filter' }
);

/**
 * Per space: the base path carries the space prefix (`/s/<space id>`).
 * `.v2` resets older keys that omitted `closed`, which left Closed open on first load.
 * Closed itself is no longer persisted — it always starts collapsed each visit.
 */
const getCollapsedSectionsStorageKey = (basePath: string): string =>
  `nightshift.investigations.collapsedSections.v2:${basePath || 'default'}`;

/**
 * Severity / in-progress / recent start open. Stored ids are sections the user collapsed.
 * Closed is session-only (see `isClosedOpen`) so it never sticks open across visits.
 */
const DEFAULT_COLLAPSED_SECTIONS: InvestigationSectionId[] = [];

/** How long a section the user was sent to keeps its highlighted border. */
const SECTION_HIGHLIGHT_MS = 700;

export interface InvestigationListHandle {
  /** Scrolls to a tier's section, reporting `false` when the list is not rendering one. */
  scrollToSeverity: (severity: Severity) => boolean;
}

export interface InvestigationListProps {
  sections: InvestigationSectionState[];
  selectedInvestigationId?: string;
  onInvestigationClick?: (investigation: InvestigationSummary) => void;
  /** Current Home search query, carried into View in Investigations links. */
  searchQuery?: string;
  /** Current Home time range, carried into View in Investigations links. */
  rangeFrom?: string;
  rangeTo?: string;
  /** Replaces the default empty copy when every section is empty. */
  emptyContent?: React.ReactNode;
}

export const InvestigationList = forwardRef<InvestigationListHandle, InvestigationListProps>(
  function InvestigationList(
    {
      sections,
      selectedInvestigationId,
      onInvestigationClick,
      searchQuery = '',
      rangeFrom = DEFAULT_INVESTIGATIONS_TIME_RANGE.from,
      rangeTo = DEFAULT_INVESTIGATIONS_TIME_RANGE.to,
      emptyContent,
    },
    ref
  ): React.ReactElement {
    const { euiTheme } = useEuiTheme();
    const visibleSections = sections.filter(isInvestigationSectionVisible);
    const { application, http } = useKibana().services;
    const viewInInvestigationsHrefFor = useMemo(() => {
      const base = application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/' });
      // getUrlForApp with path '/' ends with /app/nightshift/ — strip trailing slash for join.
      const appRoot = base.replace(/\/$/, '');
      return (id: InvestigationSectionId): string => {
        const filters = sectionIdToInvestigationsFilters(id);
        return `${appRoot}${buildInvestigationsPath({
          query: searchQuery,
          severity: filters.severity,
          state: filters.state,
          rangeFrom,
          rangeTo,
        })}`;
      };
    }, [application, rangeFrom, rangeTo, searchQuery]);

    // Default-open sections store collapses. Closed is always collapsed on load.
    const [collapsedSections = DEFAULT_COLLAPSED_SECTIONS, setCollapsedSections] = useLocalStorage<
      InvestigationSectionId[]
    >(getCollapsedSectionsStorageKey(http.basePath.get()), DEFAULT_COLLAPSED_SECTIONS);
    const [isClosedOpen, setIsClosedOpen] = useState(false);

    // EUI's accordion can hold on to an older `onToggle`, and the setter's updater form would then
    // read an older list, so the next list is built from the latest one instead.
    const collapsedSectionsRef = useRef(collapsedSections);
    collapsedSectionsRef.current = collapsedSections;

    const [highlightedSection, setHighlightedSection] = useState<Severity | null>(null);

    // The scroll in progress, so a new jump replaces it and leaving the page ends it.
    const cancelScrollRef = useRef<(() => void) | null>(null);
    useEffect(() => () => cancelScrollRef.current?.(), []);

    useEffect(() => {
      if (highlightedSection == null) {
        return;
      }
      const timeoutId = window.setTimeout(() => setHighlightedSection(null), SECTION_HIGHLIGHT_MS);
      return () => window.clearTimeout(timeoutId);
    }, [highlightedSection]);

    const isSectionOpen = useCallback(
      (id: InvestigationSectionId): boolean => {
        if (id === 'closed') {
          return isClosedOpen;
        }
        return !collapsedSections.includes(id);
      },
      [collapsedSections, isClosedOpen]
    );

    const setSectionOpen = useCallback(
      (id: InvestigationSectionId, isOpen: boolean) => {
        if (id === 'closed') {
          setIsClosedOpen(isOpen);
          return;
        }
        const others = collapsedSectionsRef.current.filter(
          (collapsedId) => collapsedId !== id && collapsedId !== 'closed'
        );
        const next = isOpen ? others : [...others, id];
        collapsedSectionsRef.current = next;
        setCollapsedSections(next);
      },
      [setCollapsedSections]
    );

    useImperativeHandle(ref, () => ({
      scrollToSeverity: (severity: Severity) => {
        const section = document.getElementById(getInvestigationSectionAnchorId(severity));
        if (section == null) {
          return false;
        }
        // The page's header bar is sticky inside the scroll area, so it would cover the section's
        // top; it only publishes its size by being measured.
        const stickyHeader = document.querySelector<HTMLElement>(
          `[data-test-subj="${APP_HEADER_TEST_SUBJECTS.root}"]`
        );
        section.style.setProperty(
          STICKY_HEADER_HEIGHT_VAR,
          `${stickyHeader?.getBoundingClientRect().height ?? 0}px`
        );
        // A tile or deep link that lands on a closed section has to show what it points at. It opens
        // as the scroll starts and the scroll follows it, then the section highlights on arrival.
        setSectionOpen(severity, true);
        cancelScrollRef.current?.();
        cancelScrollRef.current = scrollSectionIntoView(
          section,
          parseFloat(String(euiTheme.animation.normal)),
          () => setHighlightedSection(severity)
        );
        // Scrolling alone leaves keyboard and screen reader users where they were, so move focus
        // to the section too. `preventScroll` keeps the scroll above from being cut short.
        section.focus({ preventScroll: true });
        return true;
      },
    }));

    if (visibleSections.length === 0) {
      return (
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          color="subdued"
          data-test-subj="nightshiftInvestigationsEmpty"
          css={css`
            box-sizing: border-box;
            overflow: hidden;
            border-radius: ${euiTheme.border.radius.panel};
          `}
        >
          <EuiEmptyPrompt
            layout="vertical"
            color="transparent"
            paddingSize="l"
            css={css`
              max-inline-size: none;
              text-align: center;
            `}
            icon={
              <EuiIllustration
                type={notFound}
                alt=""
                data-test-subj="nightshiftInvestigationsEmptyIllustration"
                css={css`
                  max-inline-size: ${euiTheme.base * 10}px;
                  margin-inline: auto;
                `}
              />
            }
            title={
              emptyContent === undefined ? (
                <h2>{NO_INVESTIGATIONS_FOUND_MESSAGE}</h2>
              ) : undefined
            }
            titleSize="xs"
            body={
              emptyContent === undefined ? (
                <p data-test-subj="nightshiftInvestigationsEmptyHint">
                  {NO_INVESTIGATIONS_FOUND_HINT}
                </p>
              ) : (
                <div
                  css={css`
                    text-align: center;
                  `}
                >
                  {emptyContent}
                </div>
              )
            }
          />
        </EuiPanel>
      );
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
        {visibleSections.map((section) => (
          <EuiFlexItem key={section.id} grow={false}>
            <InvestigationSection
              id={section.id}
              investigations={section.investigations}
              total={section.total}
              hasMore={section.hasMore}
              isInitialLoading={section.isInitialLoading}
              isLoadingMore={section.isFetchingNextPage}
              error={section.error}
              onShowMore={section.fetchNextPage}
              onRetry={section.refetch}
              selectedInvestigationId={selectedInvestigationId}
              onInvestigationClick={onInvestigationClick}
              isOpen={isSectionOpen(section.id)}
              onToggle={(isOpen) => setSectionOpen(section.id, isOpen)}
              isHighlighted={section.id === highlightedSection}
              // Recently opened is a Home-only slice — no Investigations deep link.
              viewInInvestigationsHref={
                section.id === 'recent' ? undefined : viewInInvestigationsHrefFor(section.id)
              }
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);
