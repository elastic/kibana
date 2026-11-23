/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiPagination,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import type { FrustrationCounts } from '../../../../../common/frustration';
import type { ApplicationUsageResponse } from '../../../../../common/types/usage';
import type { BarListItem } from '../../../../components/bar_list';
import { BarList } from '../../../../components/bar_list';
import { DataPanel } from '../../../../components/data_panel';
import {
  APPLICATION_OVERVIEW_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../../ebt_constants';
import { useFormatters } from '../../../../hooks/use_formatters';
import { FRUSTRATION_DEFINITIONS } from '../../../../utils/frustration_definitions';
import type { SessionsListUrlQuery } from '../../../../utils/sessions_list_query';
import { frustrationFilterRt } from '../../../../utils/sessions_list_query';

const TITLE = i18n.translate('xpack.digitalExperience.overview.frustration.title', {
  defaultMessage: 'Frustration',
});

const PAGE_SIZE = 5;

const PAGINATION_LABEL = i18n.translate(
  'xpack.digitalExperience.overview.frustration.paginationLabel',
  { defaultMessage: 'Frustration rows pagination' }
);

const EMPTY_MESSAGE = i18n.translate('xpack.digitalExperience.overview.frustration.empty', {
  defaultMessage:
    'No frustration signals. Rage, dead and error clicks need EDOT Browser with frustration detection.',
});

const TABS_LEGEND = i18n.translate('xpack.digitalExperience.overview.frustration.tabsLegend', {
  defaultMessage: 'Group frustration signals by',
});

const DEFINITIONS_LABEL = i18n.translate(
  'xpack.digitalExperience.overview.frustration.definitionsLabel',
  { defaultMessage: 'What counts as a frustration signal' }
);

const DEFINITIONS = [
  FRUSTRATION_DEFINITIONS.rage,
  FRUSTRATION_DEFINITIONS.dead,
  FRUSTRATION_DEFINITIONS.error,
];

type FrustrationTab = 'elements' | 'pages';

const TAB_OPTIONS: Array<{ id: FrustrationTab; label: string; 'data-test-subj': string }> = [
  {
    id: 'elements',
    label: i18n.translate('xpack.digitalExperience.overview.frustration.elementsTab', {
      defaultMessage: 'Elements',
    }),
    'data-test-subj': 'digitalExperienceOverviewFrustrationElementsTab',
  },
  {
    id: 'pages',
    label: i18n.translate('xpack.digitalExperience.overview.frustration.pagesTab', {
      defaultMessage: 'Pages',
    }),
    'data-test-subj': 'digitalExperienceOverviewFrustrationPagesTab',
  },
];

const BADGE_TYPES: Array<{
  count: (counts: FrustrationCounts) => number;
  color: string;
  label: (count: string) => string;
}> = [
  {
    count: ({ rageClicks }) => rageClicks,
    color: 'danger',
    label: (count) =>
      i18n.translate('xpack.digitalExperience.overview.frustration.rageBadge', {
        defaultMessage: '{count} rage',
        values: { count },
      }),
  },
  {
    count: ({ deadClicks }) => deadClicks,
    color: 'warning',
    label: (count) =>
      i18n.translate('xpack.digitalExperience.overview.frustration.deadBadge', {
        defaultMessage: '{count} dead',
        values: { count },
      }),
  },
  {
    count: ({ errorClicks }) => errorClicks,
    color: 'accent',
    label: (count) =>
      i18n.translate('xpack.digitalExperience.overview.frustration.errorBadge', {
        defaultMessage: '{count} error',
        values: { count },
      }),
  },
];

const subtitleOf = (total: number, sessions: number) => {
  return i18n.translate('xpack.digitalExperience.overview.frustration.subtitle', {
    defaultMessage:
      '{total, plural, one {# signal} other {# signals}} in {sessions, plural, one {# session} other {# sessions}}',
    values: { total, sessions },
  });
};

const sessionsLabelOf = (count: number, isLowerBound: boolean) => {
  return isLowerBound
    ? i18n.translate('xpack.digitalExperience.overview.frustration.sessionsAtLeast', {
        defaultMessage: 'at least {count, plural, one {# session} other {# sessions}}',
        values: { count },
      })
    : i18n.translate('xpack.digitalExperience.overview.frustration.sessionsCount', {
        defaultMessage: '{count, plural, one {# session} other {# sessions}}',
        values: { count },
      });
};

const topPageLabel = (page: string) => {
  return i18n.translate('xpack.digitalExperience.overview.frustration.topPage', {
    defaultMessage: 'mostly on {page}',
    values: { page },
  });
};

const sessionsLinkLabel = (name: string) => {
  return i18n.translate('xpack.digitalExperience.overview.frustration.sessionsLinkLabel', {
    defaultMessage: 'Open sessions with frustration on {name}',
    values: { name },
  });
};

/** The sessions with frustration on one element or page; none when the value is too long to filter by. */
const frustrationQueryOf = (
  param: 'frustrationTarget' | 'frustrationPage',
  value: string
): SessionsListUrlQuery | undefined => {
  return frustrationFilterRt.is(value) ? { withFrustration: true, [param]: value } : undefined;
};

const SESSIONS_LINK = i18n.translate('xpack.digitalExperience.overview.frustration.sessionsLink', {
  defaultMessage: 'Open sessions',
});

function FrustrationRow({
  name,
  hint,
  detail,
  counts,
  sessions,
  isLowerBound,
  sessionsHref,
}: {
  name: string;
  /** Before the name, e.g. the tag of an element. */
  hint?: string | null;
  counts: FrustrationCounts;
  sessions: number;
  isLowerBound: boolean;
  /** Under the badges, e.g. the page an element is mostly frustrated on. */
  detail?: string | null;
  sessionsHref?: string;
}) {
  const { formatNumber } = useFormatters();
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj={`digitalExperienceOverviewFrustrationRow-${name}`}
    >
      <EuiFlexItem className="eui-textTruncate">
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          {hint && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{hint}</EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem className="eui-textTruncate">
            <EuiCode transparentBackground>{name}</EuiCode>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="xs" alignItems="center" wrap responsive={false}>
          {BADGE_TYPES.map(({ count, color, label }) => {
            const value = count(counts);
            return (
              value > 0 && (
                <EuiFlexItem grow={false} key={color}>
                  <EuiBadge color={color}>{label(formatNumber(value))}</EuiBadge>
                </EuiFlexItem>
              )
            );
          })}
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {sessionsLabelOf(sessions, isLowerBound)}
            </EuiText>
          </EuiFlexItem>
          {detail && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {detail}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {sessionsHref && (
        <EuiFlexItem grow={false}>
          <EuiLink
            href={sessionsHref}
            aria-label={sessionsLinkLabel(name)}
            data-test-subj={`digitalExperienceOverviewFrustrationSessionsLink-${name}`}
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_SESSIONS,
              element: APPLICATION_OVERVIEW_EBT_ELEMENTS.FRUSTRATION_SESSIONS_LINK,
            })}
          >
            {SESSIONS_LINK}
          </EuiLink>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

/**
 * The rage, dead and error clicks of the application by element and by page, each row linking to
 * the sessions it affected.
 */
export function FrustrationPanel({
  frustration,
  frustratedElements,
  frustratedPages,
  isLoading,
  sessionsHref,
}: {
  frustration: ApplicationUsageResponse['frustration'];
  frustratedElements: ApplicationUsageResponse['frustratedElements'];
  frustratedPages: ApplicationUsageResponse['frustratedPages'];
  isLoading: boolean;
  /** The sessions of the application, narrowed by the given filters. */
  sessionsHref: (query: SessionsListUrlQuery) => string;
}) {
  const [tab, setTab] = useState<FrustrationTab>('elements');
  const [pageIndex, setPageIndex] = useState(0);
  const isEmpty = frustration.total === 0;
  const rowHref = (query: SessionsListUrlQuery | undefined) => query && sessionsHref(query);

  const items: BarListItem[] =
    tab === 'elements'
      ? frustratedElements.map((element) => {
          const { cssSelector, tagName, sessions, topPage, total } = element;
          return {
            key: cssSelector,
            value: total,
            label: (
              <FrustrationRow
                name={cssSelector}
                hint={tagName}
                detail={topPage ? topPageLabel(topPage) : null}
                counts={element}
                sessions={sessions}
                isLowerBound={false}
                sessionsHref={rowHref(frustrationQueryOf('frustrationTarget', cssSelector))}
              />
            ),
          };
        })
      : frustratedPages.map((page) => {
          const { page: path, sessions, total } = page;
          return {
            key: path,
            value: total,
            label: (
              <FrustrationRow
                name={path}
                counts={page}
                sessions={sessions}
                isLowerBound
                sessionsHref={rowHref(frustrationQueryOf('frustrationPage', path))}
              />
            ),
          };
        });
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  // A refetch can return fewer rows than the page needs.
  const activePage = Math.min(pageIndex, Math.max(pageCount - 1, 0));

  return (
    <DataPanel
      title={TITLE}
      subtitle={isEmpty ? undefined : subtitleOf(frustration.total, frustration.sessions)}
      actions={
        !isEmpty && (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="info"
                aria-label={DEFINITIONS_LABEL}
                content={DEFINITIONS.map((definition) => (
                  <p key={definition}>{definition}</p>
                ))}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend={TABS_LEGEND}
                type="single"
                buttonSize="compressed"
                options={TAB_OPTIONS}
                idSelected={tab}
                onChange={(id) => {
                  setTab(id === 'pages' ? 'pages' : 'elements');
                  setPageIndex(0);
                }}
                data-test-subj="digitalExperienceOverviewFrustrationTabs"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )
      }
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage={EMPTY_MESSAGE}
      showInstrumentationDocs
      data-test-subj="digitalExperienceOverviewFrustration"
    >
      <BarList
        items={items.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE)}
        total={frustration.total}
        wholePercent
        aria-label={TITLE}
      />
      {pageCount > 1 && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPagination
                compressed
                aria-label={PAGINATION_LABEL}
                pageCount={pageCount}
                activePage={activePage}
                onPageClick={setPageIndex}
                data-test-subj="digitalExperienceOverviewFrustrationPagination"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </DataPanel>
  );
}
