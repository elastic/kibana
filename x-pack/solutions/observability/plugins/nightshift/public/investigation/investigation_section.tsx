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
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { ListInvestigationItem, Severity } from '@kbn/nightshift-investigations-plugin/common';
import { getSeverityLabel } from '@kbn/significant-events-schema';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { SEVERITY_DOT_COLOR_KEY } from '../common/severity';
import type { InvestigationSectionId } from '../hooks/use_investigation_sections';
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

/** The four mutually exclusive things a section can be showing. */
type SectionView = 'loading' | 'rows' | 'unloadable' | 'empty';

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
  return hasError ? 'unloadable' : 'empty';
};

const getSectionPresentation = (
  id: InvestigationSectionId
): { title: string; severity?: Severity } => {
  switch (id) {
    case 'in-progress':
      return {
        title: i18n.translate('xpack.nightshift.investigations.inProgressSectionTitle', {
          defaultMessage: 'In progress',
        }),
      };
    case 'failed':
      return {
        title: i18n.translate('xpack.nightshift.investigations.failedSectionTitle', {
          defaultMessage: 'Failed & cancelled',
        }),
      };
    case '80-critical':
    case '60-high':
    case '40-medium':
    case '20-low':
      return { title: getSeverityLabel(id), severity: id };
    default: {
      const exhaustive: never = id;
      throw new Error(`Unhandled investigation section: ${exhaustive}`);
    }
  }
};

function SectionPanel({
  children,
  color,
  paddingSize = 'l',
  'data-test-subj': dataTestSubj,
}: {
  children: React.ReactNode;
  color?: 'subdued';
  paddingSize?: 'none' | 'l';
  'data-test-subj'?: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      color={color}
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
}

function SectionHeading({
  id,
  total,
  showCount,
}: {
  id: InvestigationSectionId;
  total: number;
  showCount: boolean;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { title, severity } = getSectionPresentation(id);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {severity != null && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="dot" color={SEVERITY_DOT_COLOR_KEY[severity]} aria-hidden={true} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiTitle
          size="xs"
          css={css`
            font-weight: ${euiTheme.font.weight.medium};
          `}
        >
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlexItem>
      {showCount && (
        <EuiFlexItem grow={false}>
          <EuiBadge data-test-subj={`nightshiftInvestigationSectionCount-${id}`}>{total}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

function RetryCallout({
  id,
  isUnloadable,
  onRetry,
}: {
  id: InvestigationSectionId;
  isUnloadable: boolean;
  onRetry: () => void;
}): React.ReactElement {
  const actionProps = {
    primary: {
      children: i18n.translate('xpack.nightshift.retryButtonText', {
        defaultMessage: 'Retry',
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
}

function SectionRows({
  investigations,
  selectedInvestigationId,
  onInvestigationClick,
}: Pick<
  InvestigationSectionProps,
  'investigations' | 'selectedInvestigationId' | 'onInvestigationClick'
>): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <SectionPanel paddingSize="none">
      <EuiFlexGroup
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
          <EuiFlexItem key={investigation.investigation_id} grow={false}>
            <InvestigationListItem
              investigation={investigation}
              isSelected={investigation.investigation_id === selectedInvestigationId}
              onClick={onInvestigationClick}
              {...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.VIEW_INVESTIGATION,
                element: NIGHTSHIFT_EBT_ELEMENTS.INVESTIGATIONS_LIST,
                detail: investigation.status,
              })}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </SectionPanel>
  );
}

function ShowMoreButton({
  id,
  isLoadingMore,
  onShowMore,
}: {
  id: InvestigationSectionId;
  isLoadingMore: boolean;
  onShowMore: () => void;
}): React.ReactElement {
  return (
    <EuiFlexGroup justifyContent="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj={`nightshiftInvestigationSectionShowMore-${id}`}
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
}

export function InvestigationSection({
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
}: InvestigationSectionProps): React.ReactElement {
  const view = getSectionView({
    isInitialLoading,
    hasInvestigations: investigations.length > 0,
    hasError: error != null,
  });
  const anchorId = `nightshiftInvestigationSection-${id}`;

  return (
    <EuiFlexGroup
      id={anchorId}
      data-test-subj={anchorId}
      direction="column"
      gutterSize="none"
      responsive={false}
    >
      <SectionHeading id={id} total={total} showCount={view !== 'loading'} />
      <EuiSpacer size="s" />

      {view === 'loading' && (
        <SectionPanel data-test-subj={`nightshiftInvestigationSectionSkeleton-${id}`}>
          <EuiSkeletonText lines={3} />
        </SectionPanel>
      )}

      {view === 'unloadable' && <RetryCallout id={id} isUnloadable onRetry={onRetry} />}

      {view === 'empty' && (
        <SectionPanel color="subdued">
          <EuiText textAlign="center" color="subdued" size="s">
            {i18n.translate('xpack.nightshift.investigations.emptyDescription', {
              defaultMessage: 'No investigations found',
            })}
          </EuiText>
        </SectionPanel>
      )}

      {view === 'rows' && (
        <>
          {error != null && (
            <>
              <RetryCallout id={id} isUnloadable={false} onRetry={onRetry} />
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
              <ShowMoreButton id={id} isLoadingMore={isLoadingMore} onShowMore={onShowMore} />
            </>
          )}
        </>
      )}
    </EuiFlexGroup>
  );
}
