/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { forwardRef, useImperativeHandle } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ListInvestigationItem, Severity } from '@kbn/nightshift-investigations-plugin/common';
import type { InvestigationSectionState } from '../hooks/use_investigation_sections';
import { InvestigationSection } from './investigation_section';

export interface InvestigationListHandle {
  scrollToSeverity: (severity: Severity) => void;
}

export interface InvestigationListProps {
  sections: InvestigationSectionState[];
  selectedInvestigationId?: string;
  onInvestigationClick?: (investigation: ListInvestigationItem) => void;
}

const isVisibleSection = (section: InvestigationSectionState): boolean =>
  section.isInitialLoading ||
  section.error != null ||
  section.total > 0 ||
  section.investigations.length > 0;

export const InvestigationList = forwardRef<InvestigationListHandle, InvestigationListProps>(
  function InvestigationList(
    { sections, selectedInvestigationId, onInvestigationClick },
    ref
  ): React.ReactElement {
    const { euiTheme } = useEuiTheme();
    const visibleSections = sections.filter(isVisibleSection);

    useImperativeHandle(ref, () => ({
      scrollToSeverity: (severity: Severity) => {
        document.getElementById(`nightshiftInvestigationSection-${severity}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
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
            {i18n.translate('xpack.nightshift.investigations.emptyDescription', {
              defaultMessage: 'No investigations found',
            })}
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
