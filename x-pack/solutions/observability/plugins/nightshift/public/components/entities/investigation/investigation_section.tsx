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
  EuiIcon,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSkeletonText,
  EuiTitle,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { Severity } from '@kbn/nightshift-investigations-plugin/common';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { getSeverityLabel } from '@kbn/significant-events-schema';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { RETRY_BUTTON_LABEL } from '../../../common/messages';
import type { SeverityDotColor } from '../../../common/severity';
import { SEVERITY_DOT_COLOR } from '../../../common/severity';
import type {
  InvestigationSectionId,
  InvestigationSectionState,
} from '../../../data/investigations/use_investigation_sections';
import { useKibana } from '../../../hooks/use_kibana';
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
  selectedInvestigationId?: string;
  onInvestigationClick?: (investigation: InvestigationSummary) => void;
  /** Whether the section's body is shown. Sections are open unless the list says otherwise. */
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  /** Briefly draws the section's border in its severity colour, after a jump lands on it. */
  isHighlighted?: boolean;
}

/** Set on a section by the list, to the height of the sticky page header that would cover it. */
export const STICKY_HEADER_HEIGHT_VAR = '--nightshiftStickyHeaderHeight';

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

/** The card the header and its content share, so the two sit flush against each other. */
const SectionCard = ({
  children,
  highlightColor,
}: {
  children: React.ReactNode;
  /** Set while the card is highlighted. */
  highlightColor?: SeverityDotColor;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const strongBorderColors: Record<SeverityDotColor, string> = {
    danger: euiTheme.colors.borderStrongDanger,
    risk: euiTheme.colors.borderStrongRisk,
    warning: euiTheme.colors.borderStrongWarning,
    neutral: euiTheme.colors.borderStrongNeutral,
  };

  return (
    <EuiPanel
      // The border is drawn here rather than by `hasBorder`, which paints it with a pseudo-element
      // that the highlight could not recolor.
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      css={css`
        box-sizing: border-box;
        overflow: hidden;
        border: ${euiTheme.border.width.thin} solid
          ${highlightColor != null ? strongBorderColors[highlightColor] : euiTheme.border.color};

        ${euiCanAnimate} {
          transition: border-color ${euiTheme.animation.normal} ease;
        }
      `}
    >
      {children}
    </EuiPanel>
  );
};

/** A part of the card's content, divided from the header (or the part above) by a rule. */
const SectionBlock = ({
  children,
  paddingSize = 'base',
  'data-test-subj': dataTestSubj,
}: {
  children: React.ReactNode;
  paddingSize?: 'none' | 'base';
  'data-test-subj'?: string;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj={dataTestSubj}
      css={css`
        border-top: ${euiTheme.border.thin};
        padding: ${paddingSize === 'none' ? 0 : `${euiTheme.size.m} ${euiTheme.size.base}`};
      `}
    >
      {children}
    </div>
  );
};

const SectionHeading = ({
  presentation: { id, title, severity },
  total,
  showCount,
  isOpen,
}: {
  presentation: SectionPresentation;
  total: number;
  showCount: boolean;
  isOpen: boolean;
}): React.ReactElement => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    {/* Drawn here rather than with EUI's arrow, which is a button of its own. */}
    <EuiFlexItem grow={false}>
      <EuiIcon
        type="chevronSingleRight"
        aria-hidden="true"
        css={css`
          transform: rotate(${isOpen ? '90deg' : '0deg'});
        `}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <span>{title}</span>
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
    <SectionBlock paddingSize="none">
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
    </SectionBlock>
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
  isOpen = true,
  onToggle,
  isHighlighted = false,
}: InvestigationSectionProps): React.ReactElement | null => {
  const { euiTheme } = useEuiTheme();
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
          <SectionBlock data-test-subj={`nightshiftInvestigationSectionSkeleton-${id}`}>
            <EuiSkeletonText lines={3} />
          </SectionBlock>
        );
      case 'unloadable':
        return (
          <SectionBlock>
            <RetryCallout presentation={presentation} isUnloadable onRetry={onRetry} />
          </SectionBlock>
        );
      case 'rows':
        return (
          <>
            {error != null && (
              <SectionBlock>
                <RetryCallout presentation={presentation} isUnloadable={false} onRetry={onRetry} />
              </SectionBlock>
            )}
            <SectionRows
              investigations={investigations}
              selectedInvestigationId={selectedInvestigationId}
              onInvestigationClick={onInvestigationClick}
            />
            {hasMore && (
              <SectionBlock>
                <ShowMoreButton
                  presentation={presentation}
                  isLoadingMore={isLoadingMore}
                  onShowMore={onShowMore}
                />
              </SectionBlock>
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
      css={css`
        /* Jumping here lands below Kibana's fixed headers and the page's sticky header bar (whose height
           the list measures), with a little room above the card. */
        scroll-margin-top: calc(
          var(--euiFixedHeadersOffset, 0px) + var(${STICKY_HEADER_HEIGHT_VAR}, 0px) +
            ${euiTheme.size.base}
        );

        /* Focus lands here programmatically after a jump; the square ring would poke out past the
           card's rounded corners, and the highlighted border already marks the section. */
        &:focus {
          outline: none;
        }
      `}
    >
      {/* A heading cannot live inside the accordion's button, so screen readers get this one, which
          also names the region. */}
      <EuiScreenReaderOnly>
        <h2 id={presentation.headingId}>{presentation.title}</h2>
      </EuiScreenReaderOnly>
      <SectionCard
        highlightColor={
          isHighlighted && presentation.severity != null
            ? SEVERITY_DOT_COLOR[presentation.severity]
            : undefined
        }
      >
        <EuiAccordion
          id={`${presentation.anchorId}-accordion`}
          forceState={isOpen ? 'open' : 'closed'}
          arrowDisplay="none"
          onToggle={onToggle}
          paddingSize="none"
          buttonContent={
            <SectionHeading
              presentation={presentation}
              total={total}
              showCount={view !== 'loading'}
              isOpen={isOpen}
            />
          }
          buttonProps={{
            'data-test-subj': `nightshiftInvestigationSectionToggle-${id}`,
            // The padding is on the button, so the whole row is clickable and takes the hover.
            css: css`
              box-sizing: border-box;
              align-items: center;
              block-size: ${euiTheme.size.xxxl};
              padding: 0 ${euiTheme.size.base};

              &:hover,
              &:focus {
                text-decoration: none;
              }

              &:hover,
              &:focus-visible {
                background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
              }
            `,
          }}
        >
          {renderBody(view)}
        </EuiAccordion>
      </SectionCard>
    </EuiFlexGroup>
  );
};
