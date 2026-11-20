/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AnalyticsStarterQuery } from '../../types';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';
import { STABLE_QUERY_CODE_SIZE, stableQueryCode } from './shared_styles';

interface StarterQueryListProps {
  page: AnalyticsPageId;
  queries: readonly AnalyticsStarterQuery[];
  canUseDiscover: boolean;
  /** Omit for queries that cannot run as written; they are then copy-only. */
  onOpenQuery?: (query: AnalyticsStarterQuery) => void | Promise<void>;
  /** Offers to show the query as a request from the user's own code; `opener` is the control that asked. */
  onUseInApp?: (query: AnalyticsStarterQuery, opener: HTMLElement) => void;
  /** Whether opening a query is the main action of the view it sits in. */
  isPrimary?: boolean;
  /** Called when the user expands a question or opens one, so the list is not swapped under them. */
  onInteract?: () => void;
  /** Gives every expanded query the same height, so another list of queries can take this one's place. */
  hasStableLayout?: boolean;
}

/** Starter ES|QL queries shown one at a time; the others stay collapsed to their question. */
export const StarterQueryList = ({
  page,
  queries,
  canUseDiscover,
  onOpenQuery,
  onUseInApp,
  isPrimary = false,
  onInteract,
  hasStableLayout = false,
}: StarterQueryListProps): React.JSX.Element => {
  const [selectedQueryId, setSelectedQueryId] = useState<string>();
  const [pendingQueryId, setPendingQueryId] = useState<string>();
  const expandedQueryId = queries.some(({ id }) => id === selectedQueryId)
    ? selectedQueryId
    : queries[0]?.id;

  const openQuery = async (query: AnalyticsStarterQuery): Promise<void> => {
    onInteract?.();
    const opening = onOpenQuery?.(query);
    if (!(opening instanceof Promise)) {
      return;
    }
    setPendingQueryId(query.id);
    try {
      await opening;
    } finally {
      setPendingQueryId(undefined);
    }
  };

  const canOpen = onOpenQuery !== undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {queries.map((query) => {
        if (query.id !== expandedQueryId) {
          return (
            <EuiFlexItem key={query.id}>
              <EuiPanel
                hasBorder
                paddingSize="s"
                onClick={() => {
                  onInteract?.();
                  setSelectedQueryId(query.id);
                }}
                aria-expanded={false}
                data-test-subj={getPageTestSubj(page, `QueryToggle-${query.id}`)}
                data-telemetry-id={getPageTelemetryId(page, `showQuery-${query.id}`)}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="chevronSingleRight" size="s" aria-hidden />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">{query.question}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          );
        }

        return (
          <EuiFlexItem key={query.id}>
            <EuiPanel
              hasBorder
              paddingSize="m"
              data-test-subj={getPageTestSubj(page, `Query-${query.id}`)}
            >
              <EuiText size="s">
                <strong>{query.question}</strong>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiCodeBlock
                language="esql"
                isCopyable={!canOpen || !canUseDiscover}
                paddingSize="m"
                fontSize="s"
                {...(hasStableLayout && {
                  overflowHeight: STABLE_QUERY_CODE_SIZE,
                  css: stableQueryCode,
                })}
                data-test-subj={getPageTestSubj(page, `QueryCode-${query.id}`)}
              >
                {query.esql}
              </EuiCodeBlock>
              {(canOpen || onUseInApp !== undefined) && (
                <>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                    {canOpen && (
                      <EuiFlexItem grow={false}>
                        <EuiToolTip
                          content={
                            canUseDiscover
                              ? undefined
                              : i18n.translate(
                                  'xpack.searchHomepage.analytics.starterQueries.missingDiscoverPrivilege',
                                  {
                                    defaultMessage:
                                      'You need access to Discover to run this query.',
                                  }
                                )
                          }
                        >
                          <EuiButton
                            fill={isPrimary}
                            size="s"
                            iconType="discoverApp"
                            onClick={() => openQuery(query)}
                            isLoading={pendingQueryId === query.id}
                            isDisabled={!canUseDiscover}
                            hasAriaDisabled
                            aria-label={i18n.translate(
                              'xpack.searchHomepage.analytics.starterQueries.openInDiscoverAriaLabel',
                              {
                                defaultMessage: 'Open in Discover: {question}',
                                values: { question: query.question },
                              }
                            )}
                            data-test-subj={getPageTestSubj(page, `OpenInDiscover-${query.id}`)}
                            data-telemetry-id={getPageTelemetryId(
                              page,
                              `openInDiscover-${query.id}`
                            )}
                          >
                            {i18n.translate(
                              'xpack.searchHomepage.analytics.starterQueries.openInDiscoverButton',
                              { defaultMessage: 'Open in Discover' }
                            )}
                          </EuiButton>
                        </EuiToolTip>
                      </EuiFlexItem>
                    )}
                    {onUseInApp !== undefined && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="s"
                          iconType="code"
                          onClick={({ currentTarget }: MouseEvent<HTMLElement>) => {
                            onInteract?.();
                            onUseInApp(query, currentTarget);
                          }}
                          aria-label={i18n.translate(
                            'xpack.searchHomepage.analytics.starterQueries.useInAppAriaLabel',
                            {
                              defaultMessage: 'Use in your app: {question}',
                              values: { question: query.question },
                            }
                          )}
                          data-test-subj={getPageTestSubj(page, `UseInApp-${query.id}`)}
                          data-telemetry-id={getPageTelemetryId(page, `useInApp-${query.id}`)}
                        >
                          {i18n.translate(
                            'xpack.searchHomepage.analytics.starterQueries.useInAppButton',
                            { defaultMessage: 'Use in your app' }
                          )}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </>
              )}
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
