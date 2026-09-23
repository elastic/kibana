/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { ListInvestigationItem, Severity } from '@kbn/nightshift-investigations-plugin/common';
import { getSeverityLabel } from '@kbn/significant-events-schema';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { RETRY_BUTTON_LABEL } from '../common/messages';
import { SEVERITY_DOT_COLOR } from '../common/severity';
import type {
  InvestigationSectionId,
  InvestigationSectionState,
} from '../hooks/use_investigation_sections';
import { InvestigationListItem } from './investigation_list_item';

export interface InvestigationSectionProps {
  id: InvestigationSectionId;
  investigations: ListInvestigationItem[];
  total: number;
  hasMore: boolean;
  isInitialLoading?: boolean;
  isLoadingMore?: boolean;
  error?: Error | null;
  onShowMore: () => void;
  onRetry: () => void;
  selectedInvestigationId?: string;
  onInvestigationClick?: (investigation: ListInvestigationItem) => void;
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
    case 'failed':
      return {
        ...anchors,
        title: i18n.translate('xpack.nightshift.investigations.failedSectionTitle', {
          defaultMessage: 'Failed & cancelled',
        }),
      };
    case '80-critical':
    case '60-high':
    case '40-medium':
    case '20-low':
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

const SectionPanel = ({
  children,
  paddingSize = 'l',
  'data-test-subj': dataTestSubj,
}: {
  children: React.ReactNode;
  paddingSize?: 'none' | 'l';
  'data-test-subj'?: string;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize={paddingSize}
      data-test-subj={dataTestSubj}
      css={css`
        box-sizing: border-box;
        overflow: hidden;
        border-radius: ${euiTheme.size.s};
      `}
    >
      {children}
    </EuiPanel>
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
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {severity != null && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="dot" color={SEVERITY_DOT_COLOR[severity]} aria-hidden={true} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiTitle
          size="xs"
          css={css`
            font-weight: ${euiTheme.font.weight.medium};
          `}
        >
          <h2 id={headingId}>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>
      {showCount && (
        <EuiFlexItem grow={false}>
          <EuiBadge data-test-subj={`nightshiftInvestigationSectionCount-${id}`}>{total}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

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

  return (
    <SectionPanel paddingSize="none">
      <EuiFlexGroup
        role="list"
        direction="column"
        gutterSize="none"
        responsive={false}
        css={css`
          /* Divide consecutive rows, without a rule above the first or below the last. */
          > * + * {
            border-top: ${euiTheme.border.thin};
          }
        `}
      >
        {investigations.map((investigation) => (
          <EuiFlexItem role="listitem" key={investigation.investigation_id} grow={false}>
            <InvestigationListItem
              investigation={investigation}
              isSelected={investigation.investigation_id === selectedInvestigationId}
              onClick={onInvestigationClick}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </SectionPanel>
  );
};

const ShowMoreButton = ({
  presentation: { id, title },
  isLoadingMore,
  onShowMore,
}: {
  presentation: SectionPresentation;
  isLoadingMore: boolean;
  onShowMore: () => void;
}): React.ReactElement => (
  <EuiFlexGroup justifyContent="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        data-test-subj={`nightshiftInvestigationSectionShowMore-${id}`}
        // Six sections each render a "Show more", so the accessible name has to say which one.
        aria-label={i18n.translate('xpack.nightshift.investigations.sectionShowMoreAriaLabel', {
          defaultMessage: 'Show more {sectionTitle} investigations',
          values: { sectionTitle: title },
        })}
        isLoading={isLoadingMore}
        size="s"
        onClick={onShowMore}
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.SHOW_MORE_INVESTIGATIONS,
          element: NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATIONS_LIST,
        })}
      >
        {i18n.translate('xpack.nightshift.investigations.showMoreButtonLabel', {
          defaultMessage: 'Show more',
        })}
      </EuiButtonEmpty>
    </EuiFlexItem>
  </EuiFlexGroup>
);

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
          <SectionPanel data-test-subj={`nightshiftInvestigationSectionSkeleton-${id}`}>
            <EuiSkeletonText lines={3} />
          </SectionPanel>
        );
      case 'unloadable':
        return <RetryCallout presentation={presentation} isUnloadable onRetry={onRetry} />;
      case 'rows':
        return (
          <>
            {error != null && (
              <>
                <RetryCallout presentation={presentation} isUnloadable={false} onRetry={onRetry} />
                <EuiSpacer size="s" />
              </>
            )}
            <SectionRows
              investigations={investigations}
              selectedInvestigationId={selectedInvestigationId}
              onInvestigationClick={onInvestigationClick}
            />
            {hasMore && (
              <>
                <EuiSpacer size="s" />
                <ShowMoreButton
                  presentation={presentation}
                  isLoadingMore={isLoadingMore}
                  onShowMore={onShowMore}
                />
              </>
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
    <EuiFlexGroup
      id={presentation.anchorId}
      data-test-subj={presentation.anchorId}
      // Scrolling here also moves focus, so keyboard and screen reader users follow the jump.
      role="region"
      aria-labelledby={presentation.headingId}
      tabIndex={-1}
      direction="column"
      gutterSize="none"
      responsive={false}
    >
      <SectionHeading presentation={presentation} total={total} showCount={view !== 'loading'} />
      <EuiSpacer size="s" />
      {renderBody(view)}
    </EuiFlexGroup>
  );
};
