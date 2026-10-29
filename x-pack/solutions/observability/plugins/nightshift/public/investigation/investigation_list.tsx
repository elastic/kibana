/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { Severity } from '@kbn/nightshift-investigations-plugin/common';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { NO_INVESTIGATIONS_FOUND_MESSAGE } from '../common/messages';
import type { InvestigationSectionState } from '../hooks/use_investigation_sections';
import {
  getInvestigationSectionAnchorId,
  getInvestigationSectionBodyId,
  InvestigationSection,
  isInvestigationSectionVisible,
} from './investigation_section';
import { useInvestigationSectionExpansion } from './use_investigation_section_expansion';

export interface InvestigationListHandle {
  /** Scrolls to a tier's section, reporting `false` when the list is not rendering one. */
  scrollToSeverity: (severity: Severity) => boolean;
}

export interface InvestigationListProps {
  sections: InvestigationSectionState[];
  selectedInvestigationId?: string;
  onInvestigationClick?: (investigation: InvestigationSummary) => void;
}

const scrollToSection = (section: HTMLElement): void => {
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Scrolling alone leaves keyboard and screen reader users where they were, so move focus to
  // the section too. `preventScroll` keeps the smooth scroll above from being cut short.
  section.focus({ preventScroll: true });
};

/** Longest time any transition on the element can still run, in milliseconds; 0 when it has none. */
const getTransitionEndMs = (element: HTMLElement): number => {
  const style = window.getComputedStyle(element);
  const toMs = (value: string): number => {
    const seconds = parseFloat(value);
    return Number.isFinite(seconds) ? seconds * (value.trim().endsWith('ms') ? 1 : 1000) : 0;
  };
  const durations = style.transitionDuration.split(',').map(toMs);
  const delays = style.transitionDelay.split(',').map(toMs);
  return Math.max(0, ...durations.map((duration, index) => duration + (delays[index] ?? 0)));
};

/**
 * Runs `callback` once `element` has finished growing: after its transition ends, or at once when
 * it has none (reduced motion, or a test DOM). `transitionend` does not fire in a hidden tab or
 * when the transition is interrupted, so a timer covers that path.
 */
const runAfterTransition = (element: HTMLElement, callback: () => void): (() => void) => {
  const transitionEndMs = getTransitionEndMs(element);
  if (transitionEndMs === 0) {
    callback();
    return () => {};
  }
  let done = false;
  const finish = () => {
    if (done) {
      return;
    }
    done = true;
    cleanup();
    callback();
  };
  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.target === element) {
      finish();
    }
  };
  const timeout = window.setTimeout(finish, transitionEndMs + 50);
  const cleanup = () => {
    element.removeEventListener('transitionend', onTransitionEnd);
    window.clearTimeout(timeout);
  };
  element.addEventListener('transitionend', onTransitionEnd);
  return cleanup;
};

export const InvestigationList = forwardRef<InvestigationListHandle, InvestigationListProps>(
  function InvestigationList(
    { sections, selectedInvestigationId, onInvestigationClick },
    ref
  ): React.ReactElement {
    const { euiTheme } = useEuiTheme();
    const visibleSections = sections.filter(isInvestigationSectionVisible);
    const expansion = useInvestigationSectionExpansion();
    // A tier whose section was collapsed when a scroll to it was asked for; see the effect below.
    const [pendingScrollSeverity, setPendingScrollSeverity] = useState<Severity | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        scrollToSeverity: (severity: Severity) => {
          const section = document.getElementById(getInvestigationSectionAnchorId(severity));
          if (section == null) {
            return false;
          }
          if (expansion.isExpanded(severity)) {
            scrollToSection(section);
            return true;
          }
          // A jump to a collapsed section would land on a lone heading, so open it first. The rows
          // are not laid out until React commits the open state and the accordion has grown, and
          // a scroll measured before that can be clamped to the shorter page, so it waits.
          expansion.expand(severity);
          setPendingScrollSeverity(severity);
          return true;
        },
      }),
      [expansion]
    );

    useEffect(() => {
      if (pendingScrollSeverity == null) {
        return;
      }
      const section = document.getElementById(
        getInvestigationSectionAnchorId(pendingScrollSeverity)
      );
      const body = document.getElementById(getInvestigationSectionBodyId(pendingScrollSeverity));
      if (section == null || body == null) {
        setPendingScrollSeverity(null);
        return;
      }
      return runAfterTransition(body, () => {
        setPendingScrollSeverity(null);
        scrollToSection(section);
      });
    }, [pendingScrollSeverity]);

    if (visibleSections.length === 0) {
      return (
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="l"
          color="subdued"
          data-test-subj="nightshiftInvestigationsEmpty"
          css={css`
            box-sizing: border-box;
            overflow: hidden;
            border-radius: ${euiTheme.border.radius.panel};
          `}
        >
          <EuiText textAlign="center" color="subdued" size="s">
            {NO_INVESTIGATIONS_FOUND_MESSAGE}
          </EuiText>
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
              isExpanded={expansion.isExpanded(section.id)}
              onToggle={() => expansion.toggle(section.id)}
              selectedInvestigationId={selectedInvestigationId}
              onInvestigationClick={onInvestigationClick}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);
