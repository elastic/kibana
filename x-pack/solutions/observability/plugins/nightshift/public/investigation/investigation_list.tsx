/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { forwardRef, useImperativeHandle } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { ListInvestigationItem, Severity } from '@kbn/nightshift-investigations-plugin/common';
import { NO_INVESTIGATIONS_FOUND_MESSAGE } from '../common/messages';
import type { InvestigationSectionState } from '../hooks/use_investigation_sections';
import {
  getInvestigationSectionAnchorId,
  InvestigationSection,
  isInvestigationSectionVisible,
} from './investigation_section';

export interface InvestigationListHandle {
  /** Scrolls to a tier's section, reporting `false` when the list is not rendering one. */
  scrollToSeverity: (severity: Severity) => boolean;
}

export interface InvestigationListProps {
  sections: InvestigationSectionState[];
  selectedInvestigationId?: string;
  onInvestigationClick?: (investigation: ListInvestigationItem) => void;
}

export const InvestigationList = forwardRef<InvestigationListHandle, InvestigationListProps>(
  function InvestigationList(
    { sections, selectedInvestigationId, onInvestigationClick },
    ref
  ): React.ReactElement {
    const { euiTheme } = useEuiTheme();
    const visibleSections = sections.filter(isInvestigationSectionVisible);

    useImperativeHandle(ref, () => ({
      scrollToSeverity: (severity: Severity) => {
        const section = document.getElementById(getInvestigationSectionAnchorId(severity));
        if (section == null) {
          return false;
        }
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Scrolling alone leaves keyboard and screen reader users where they were, so move focus
        // to the section too. `preventScroll` keeps the smooth scroll above from being cut short.
        section.focus({ preventScroll: true });
        return true;
      },
    }));

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
            border-radius: ${euiTheme.size.s};
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
              selectedInvestigationId={selectedInvestigationId}
              onInvestigationClick={onInvestigationClick}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);
