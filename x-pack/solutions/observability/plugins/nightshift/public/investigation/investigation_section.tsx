/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { Severity } from '@kbn/nightshift-investigations-plugin/common';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { getSeverityLabel } from '@kbn/significant-events-schema';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { RETRY_BUTTON_LABEL } from '../common/messages';
import { SEVERITY_DOT_COLOR } from '../common/severity';
import { INVESTIGATIONS_PAGE_SIZE } from '../hooks/use_fetch_investigations';
import type {
  InvestigationSectionId,
  InvestigationSectionState,
} from '../hooks/use_investigation_sections';
import { useKibana } from '../hooks/use_kibana';
import { InvestigationCardActions } from './investigation_card_actions';

export interface InvestigationSectionProps {
  id: InvestigationSectionId;
  investigations: InvestigationSummary[];
  total: number;
  hasMore: boolean;
  isInitialLoading?: boolean;
  isLoadingMore?: boolean;
  error?: Error | null;
  onShowMore: () => void;
  onRetry: () => void;
  /** Collapsed sections keep their heading and count; the rows are hidden. */
  isExpanded: boolean;
  onToggle: () => void;
  selectedInvestigationId?: string;
  onInvestigationClick?: (investigation: InvestigationSummary) => void;
}

/** The scroll anchor a severity tile and a `?severity=` deep link both target. */
export const getInvestigationSectionAnchorId = (id: InvestigationSectionId): string =>
  `nightshiftInvestigationSection-${id}`;

/** Everything derived from a section's id: what it is called and where it is anchored. */
interface SectionPresentation {
  id: InvestigationSectionId;
  title: string;
  severity?: Severity;
  anchorId: string;
  headingId: string;
}

const getSectionPresentation = (id: InvestigationSectionId): SectionPresentation => {
  const anchorId = getInvestigationSectionAnchorId(id);
  const anchors = { id, anchorId, headingId: `${anchorId}-heading` };

  switch (id) {
    case 'in-progress':
      return {
        ...anchors,
        title: i18n.translate('xpack.nightshift.investigations.inProgressSectionTitle', {
          defaultMessage: 'In progress',
        }),
      };
    case 'not-rated':
      return {
        ...anchors,
        title: i18n.translate('xpack.nightshift.investigations.notRatedSectionTitle', {
          defaultMessage: 'Not rated',
        }),
      };
    case 'closed':
      return {
        ...anchors,
        title: i18n.translate('xpack.nightshift.investigations.closedSectionTitle', {
          defaultMessage: 'Closed',
        }),
      };
    case 'critical':
    case 'high':
    case 'medium':
    case 'low':
      return { ...anchors, title: getSeverityLabel(id), severity: id };
    default: {
      const exhaustive: never = id;
      throw new Error(`Unhandled investigation section: ${exhaustive}`);
    }
  }
};

/**
 * What a section is showing. `hidden` covers the section having nothing to say at all — the list
 * skips it rather than rendering a heading over a "none found" panel, so emptiness is decided
 * here and nowhere else.
 */
type SectionView = 'loading' | 'rows' | 'unloadable' | 'hidden';

type VisibleSectionView = Exclude<SectionView, 'hidden'>;

const getSectionView = ({
  isInitialLoading,
  hasInvestigations,
  hasError,
}: {
  isInitialLoading: boolean;
  hasInvestigations: boolean;
  hasError: boolean;
}): SectionView => {
  if (isInitialLoading) {
    return 'loading';
  }
  if (hasInvestigations) {
    return 'rows';
  }
  return hasError ? 'unloadable' : 'hidden';
};

/** Whether the list should render this section at all. */
export const isInvestigationSectionVisible = (section: InvestigationSectionState): boolean =>
  getSectionView({
    isInitialLoading: section.isInitialLoading,
    hasInvestigations: section.investigations.length > 0,
    hasError: section.error != null,
  }) !== 'hidden';

/** The bordered card around a section; the accordion header and rows sit inside it. */
const SectionPanel = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      css={css`
        box-sizing: border-box;
        overflow: hidden;
        border-radius: ${euiTheme.border.radius.panel};
      `}
    >
      {children}
    </EuiPanel>
  );
};

/** Padding for body content that is not the row list: skeletons and callouts. */
const SectionBodyInset = ({
  children,
  'data-test-subj': dataTestSubj,
}: {
  children: React.ReactNode;
  'data-test-subj'?: string;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj={dataTestSubj}
      css={css`
        padding: ${euiTheme.size.base};
      `}
    >
      {children}
    </div>
  );
};

const SectionHeading = ({
  presentation: { id, title, severity, headingId },
  total,
  showCount,
}: {
  presentation: SectionPresentation;
  total: number;
  showCount: boolean;
}): React.ReactElement => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <h2 id={headingId}>{title}</h2>
      </EuiTitle>
    </EuiFlexItem>
    {showCount && (
      <EuiFlexItem grow={false}>
        <EuiBadge
          color={severity != null ? SEVERITY_DOT_COLOR[severity] : 'default'}
          data-test-subj={`nightshiftInvestigationSectionCount-${id}`}
        >
          {total}
        </EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

const RetryCallout = ({
  presentation: { id, title },
  isUnloadable,
  onRetry,
}: {
  presentation: SectionPresentation;
  isUnloadable: boolean;
  onRetry: () => void;
}): React.ReactElement => {
  const actionProps = {
    primary: {
      children: RETRY_BUTTON_LABEL,
      // Six sections each render a "Retry", so the accessible name has to say which one.
      'aria-label': i18n.translate('xpack.nightshift.investigations.sectionRetryAriaLabel', {
        defaultMessage: 'Retry loading {sectionTitle} investigations',
        values: { sectionTitle: title },
      }),
      iconType: 'refresh',
      onClick: onRetry,
      'data-test-subj': `nightshiftInvestigationSectionRetry-${id}`,
      ...getEbtProps({
        action: NIGHTSHIFT_EBT_ACTIONS.RETRY_INVESTIGATIONS,
        element: NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATIONS_LIST,
      }),
    },
  };

  return isUnloadable ? (
    <KbnDangerCallout
      announceOnMount
      size="s"
      title={i18n.translate('xpack.nightshift.investigations.sectionLoadingErrorTitle', {
        defaultMessage: 'Unable to load investigations',
      })}
      actionProps={actionProps}
    />
  ) : (
    <KbnWarningCallout
      announceOnMount
      size="s"
      title={i18n.translate('xpack.nightshift.investigations.sectionRefreshWarningTitle', {
        defaultMessage: 'Showing the last loaded results; refreshing failed.',
      })}
      actionProps={actionProps}
    />
  );
};

const SectionRows = ({
  investigations,
  selectedInvestigationId,
  onInvestigationClick,
}: Pick<
  InvestigationSectionProps,
  'investigations' | 'selectedInvestigationId' | 'onInvestigationClick'
>): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const InvestigationCard = useKibana().services.agenticInvestigations?.InvestigationCard;

  return (
    <EuiFlexGroup
      role="list"
      direction="column"
      gutterSize="none"
      responsive={false}
      css={css`
        /* Divide the rows from the header and from each other, without a rule below the last. */
        > * {
          border-top: ${euiTheme.border.thin};
        }
      `}
    >
      {investigations.map((investigation) => (
        <EuiFlexItem
          role="listitem"
          key={investigation.id}
          grow={false}
          data-test-subj="nightshiftInvestigationListItem"
          {...(onInvestigationClick
            ? getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.VIEW_INVESTIGATION,
                element: NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATIONS_LIST,
                detail: investigation.in_progress ? 'running' : 'complete',
              })
            : {})}
        >
          {InvestigationCard && (
            <InvestigationCard
              investigation={investigation}
              isSelected={investigation.id === selectedInvestigationId}
              onClick={onInvestigationClick}
              actions={<InvestigationCardActions investigation={investigation} />}
            />
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const ShowMoreButton = ({
  presentation: { id, title },
  remainingCount,
  isLoadingMore,
  onShowMore,
}: {
  presentation: SectionPresentation;
  /** Investigations in this section that are not loaded yet. */
  remainingCount: number;
  isLoadingMore: boolean;
  onShowMore: () => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const nextBatchCount = Math.min(INVESTIGATIONS_PAGE_SIZE, remainingCount);
  const label =
    nextBatchCount > 0
      ? i18n.translate('xpack.nightshift.investigations.showMoreOfRemainingButtonLabel', {
          defaultMessage: 'Show {nextBatchCount} more of {remainingCount}',
          values: { nextBatchCount, remainingCount },
        })
      : i18n.translate('xpack.nightshift.investigations.showMoreButtonLabel', {
          defaultMessage: 'Show more',
        });

  return (
    <EuiFlexGroup
      justifyContent="center"
      responsive={false}
      css={css`
        border-top: ${euiTheme.border.thin};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj={`nightshiftInvestigationSectionShowMore-${id}`}
          // Every section renders a "Show more", so the accessible name has to say which one.
          aria-label={i18n.translate('xpack.nightshift.investigations.sectionShowMoreAriaLabel', {
            defaultMessage: '{label} {sectionTitle} investigations',
            values: { label, sectionTitle: title },
          })}
          iconType="chevronSingleDown"
          isLoading={isLoadingMore}
          size="s"
          onClick={onShowMore}
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.SHOW_MORE_INVESTIGATIONS,
            element: NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATIONS_LIST,
          })}
        >
          {label}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const InvestigationSection = ({
  id,
  investigations,
  total,
  hasMore,
  isInitialLoading = false,
  isLoadingMore = false,
  error = null,
  onShowMore,
  onRetry,
  isExpanded,
  onToggle,
  selectedInvestigationId,
  onInvestigationClick,
}: InvestigationSectionProps): React.ReactElement | null => {
  const presentation = getSectionPresentation(id);
  const view = getSectionView({
    isInitialLoading,
    hasInvestigations: investigations.length > 0,
    hasError: error != null,
  });

  const renderBody = (visibleView: VisibleSectionView): React.ReactNode => {
    switch (visibleView) {
      case 'loading':
        return (
          <SectionBodyInset data-test-subj={`nightshiftInvestigationSectionSkeleton-${id}`}>
            <EuiSkeletonText lines={3} />
          </SectionBodyInset>
        );
      case 'unloadable':
        return (
          <SectionBodyInset>
            <RetryCallout presentation={presentation} isUnloadable onRetry={onRetry} />
          </SectionBodyInset>
        );
      case 'rows':
        return (
          <>
            {error != null && (
              <SectionBodyInset>
                <RetryCallout presentation={presentation} isUnloadable={false} onRetry={onRetry} />
              </SectionBodyInset>
            )}
            <SectionRows
              investigations={investigations}
              selectedInvestigationId={selectedInvestigationId}
              onInvestigationClick={onInvestigationClick}
            />
            {hasMore && (
              <ShowMoreButton
                presentation={presentation}
                remainingCount={Math.max(total - investigations.length, 0)}
                isLoadingMore={isLoadingMore}
                onShowMore={onShowMore}
              />
            )}
          </>
        );
      default: {
        const exhaustive: never = visibleView;
        throw new Error(`Unhandled investigation section view: ${exhaustive}`);
      }
    }
  };

  if (view === 'hidden') {
    return null;
  }

  return (
    <div
      id={presentation.anchorId}
      data-test-subj={presentation.anchorId}
      // Scrolling here also moves focus, so keyboard and screen reader users follow the jump.
      role="region"
      aria-labelledby={presentation.headingId}
      tabIndex={-1}
    >
      <SectionPanel>
        <EuiAccordion
          id={`${presentation.anchorId}-accordion`}
          // The heading lives in the trigger, and a heading cannot sit inside a button; EUI then
          // makes the arrow the keyboard control and keeps the whole header clickable.
          buttonElement="div"
          buttonContent={
            <SectionHeading
              presentation={presentation}
              total={total}
              showCount={view !== 'loading'}
            />
          }
          buttonProps={{
            paddingSize: 'm',
            'data-test-subj': `nightshiftInvestigationSectionToggle-${id}`,
          }}
          arrowDisplay="left"
          paddingSize="none"
          forceState={isExpanded ? 'open' : 'closed'}
          onToggle={onToggle}
        >
          {renderBody(view)}
        </EuiAccordion>
      </SectionPanel>
    </div>
  );
};
