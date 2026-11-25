/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiLink } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { EntryPage } from '../../../../../common/types/overview';
import {
  entryPageFilterRt,
  type SessionsListUrlQuery,
} from '../../../../utils/sessions_list_query';
import { DataPanel } from '../../../../components/data_panel';
import { TruncatedCode } from '../../../../components/truncated_code';
import {
  APPLICATION_OVERVIEW_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../../ebt_constants';
import { useFormatters } from '../../../../hooks/use_formatters';
import { SESSIONS_LABEL } from '../../../../labels';
import { metricColumnPreset } from '../../../../utils/column_presets';

const TITLE = i18n.translate('xpack.digitalExperience.overview.entryPages.title', {
  defaultMessage: 'Entry pages',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.overview.entryPages.subtitle', {
  defaultMessage:
    'The ten pages sessions started on the most, with the share of their sessions that left without visiting another page. Select a page to open its sessions.',
});

const FILTERS_NOTE = i18n.translate('xpack.digitalExperience.overview.entryPages.filtersNote', {
  defaultMessage:
    'Narrowed by the environment, browser, operating system, device, country and app version. The page filters and the query read single events, which the session summaries do not keep, so they leave this table whole.',
});

const PAGE_LABEL = i18n.translate('xpack.digitalExperience.overview.entryPages.pageLabel', {
  defaultMessage: 'Entry page',
});

const BOUNCE_RATE_LABEL = i18n.translate(
  'xpack.digitalExperience.overview.entryPages.bounceRateLabel',
  { defaultMessage: 'Bounce rate' }
);

const EMPTY_MESSAGE = i18n.translate('xpack.digitalExperience.overview.entryPages.empty', {
  defaultMessage:
    'No sessions with a page in this time range. Sessions are summarized in the background, so the most recent ones can take a few minutes to show.',
});

const sessionsLinkLabel = (page: string) =>
  i18n.translate('xpack.digitalExperience.overview.entryPages.sessionsLink', {
    defaultMessage: 'Open the sessions that started on {page}',
    values: { page },
  });

/**
 * The pages sessions started on, from the session summaries, with their sessions and bounce rate.
 * A page opens the Sessions tab on the sessions that started on it.
 */
export function EntryPagesPanel({
  entryPages,
  isLoading,
  sessionsHref,
}: {
  entryPages: EntryPage[];
  isLoading: boolean;
  /** The sessions of the application, narrowed by the given filters. */
  sessionsHref: (query: SessionsListUrlQuery) => string;
}) {
  const { formatNumber, formatPercent } = useFormatters();

  const columns: Array<EuiBasicTableColumn<EntryPage>> = [
    {
      field: 'page',
      name: PAGE_LABEL,
      render: (page: string) =>
        // A page the list's filter would reject (too long) has no sessions to open.
        !entryPageFilterRt.is(page) ? (
          <TruncatedCode value={page} title={page} />
        ) : (
          <EuiLink
            color="text"
            css={{ display: 'block', maxInlineSize: '100%' }}
            href={sessionsHref({ entryPage: page })}
            aria-label={sessionsLinkLabel(page)}
            data-test-subj="digitalExperienceOverviewEntryPageSessionsLink"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.VIEW_SESSIONS,
              element: APPLICATION_OVERVIEW_EBT_ELEMENTS.ENTRY_PAGE_SESSIONS_LINK,
            })}
          >
            <TruncatedCode value={page} title={page} />
          </EuiLink>
        ),
    },
    {
      field: 'sessions',
      name: SESSIONS_LABEL,
      ...metricColumnPreset<EntryPage>(),
      render: (sessions: number) => formatNumber(sessions),
    },
    {
      field: 'bounceRate',
      name: BOUNCE_RATE_LABEL,
      ...metricColumnPreset<EntryPage>(),
      render: (bounceRate: number) => formatPercent(bounceRate),
    },
  ];

  return (
    <DataPanel
      title={TITLE}
      subtitle={`${SUBTITLE} ${FILTERS_NOTE}`}
      isLoading={isLoading}
      isEmpty={entryPages.length === 0}
      emptyMessage={EMPTY_MESSAGE}
      data-test-subj="digitalExperienceOverviewEntryPages"
    >
      <EuiBasicTable<EntryPage>
        tableCaption={TITLE}
        items={entryPages}
        columns={columns}
        rowHeader="page"
        tableLayout="auto"
        scrollableInline
      />
    </DataPanel>
  );
}
