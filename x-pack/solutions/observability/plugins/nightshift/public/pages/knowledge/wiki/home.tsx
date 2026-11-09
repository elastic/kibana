/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type Ref } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage, FormattedNumber, FormattedRelative } from '@kbn/i18n-react';
import { getWikiEntityTypeSingularLabel } from './entity_type_labels';
import { WikiPageRow } from './page_row';
import type { WikiPageSummary, WikiStats } from './types';

interface WikiHomeProps {
  pages: WikiPageSummary[];
  stats: WikiStats;
  onSelectPage: (id: string) => void;
  titleRef?: Ref<HTMLHeadingElement>;
}

export function WikiHome({ pages, stats, onSelectPage, titleRef }: WikiHomeProps) {
  const recentlyUpdated = useMemo(
    () => [...pages].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8),
    [pages]
  );
  const mostCorroborated = useMemo(
    () =>
      [...pages]
        .filter((page) => page.corroborations > 0)
        .sort((a, b) => b.corroborations - a.corroborations)
        .slice(0, 3),
    [pages]
  );

  return (
    <div data-test-subj="nightshiftWikiHome">
      <EuiTitle size="s">
        <h2 ref={titleRef} tabIndex={-1}>
          <FormattedMessage id="xpack.nightshift.knowledge.wiki.homeTitle" defaultMessage="Wiki" />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.nightshift.knowledge.wiki.homeDescription"
            defaultMessage="Durable knowledge the investigator reads before each run."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.nightshift.knowledge.wiki.stats.pagesLabel"
          defaultMessage="{count, plural, one {# page} other {# pages}}"
          values={{ count: stats.total }}
        />
        {' · '}
        <FormattedMessage
          id="xpack.nightshift.knowledge.wiki.stats.establishedLabel"
          defaultMessage="{count} established"
          values={{ count: stats.established }}
        />
        {' · '}
        <FormattedMessage
          id="xpack.nightshift.knowledge.wiki.stats.corroborationsLabel"
          defaultMessage="{count} total corroborations"
          values={{ count: <FormattedNumber value={stats.total_corroborations} /> }}
        />
        {stats.last_updated !== undefined && (
          <>
            {' · '}
            <FormattedMessage
              id="xpack.nightshift.knowledge.wiki.stats.lastUpdatedLabel"
              defaultMessage="last updated {when}"
              values={{ when: <FormattedRelative value={stats.last_updated} /> }}
            />
          </>
        )}
      </EuiText>
      {mostCorroborated.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                id="xpack.nightshift.knowledge.wiki.mostCorroboratedTitle"
                defaultMessage="Most corroborated"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s">
            {mostCorroborated.map((page) => (
              <EuiFlexItem key={page.id}>
                <EuiPanel
                  hasBorder
                  paddingSize="m"
                  className={css`
                    height: 100%;
                  `}
                >
                  <EuiLink
                    data-test-subj="significantEventsAppWikiHomeLink"
                    onClick={() => onSelectPage(page.id)}
                  >
                    {page.title}
                  </EuiLink>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued">
                    {getWikiEntityTypeSingularLabel(page.entity_type)}
                    {' · '}
                    <FormattedMessage
                      id="xpack.nightshift.knowledge.wiki.pageCorroborationsLabel"
                      defaultMessage="{count, plural, one {# corroboration} other {# corroborations}}"
                      values={{ count: page.corroborations }}
                    />
                  </EuiText>
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
      <EuiSpacer size="l" />
      <EuiTitle size="xxs">
        <h3>
          <FormattedMessage
            id="xpack.nightshift.knowledge.wiki.recentlyUpdatedTitle"
            defaultMessage="Recently updated"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {recentlyUpdated.length === 0 ? (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.nightshift.knowledge.wiki.recentlyUpdatedEmptyDescription"
            defaultMessage="No pages yet. Investigations will propose Wiki pages after each run."
          />
        </EuiText>
      ) : (
        recentlyUpdated.map((page, index) => (
          <React.Fragment key={page.id}>
            {index > 0 && <EuiHorizontalRule margin="s" />}
            <WikiPageRow page={page} onSelectPage={onSelectPage} />
          </React.Fragment>
        ))
      )}
    </div>
  );
}
