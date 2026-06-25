/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
import { useReactFlow } from '@xyflow/react';
import type { NodeViewModel } from '../types';
import { getFindInPageMatches } from './graph_entity_filters';
import { useGraphSearchContext } from './graph_search_context';

export const GRAPH_FIND_IN_PAGE_INPUT_ID = 'graphFindInPageInput';

const CENTER_ZOOM = 1.2;
const CENTER_ANIMATION_DURATION_MS = 200;
const SIMPLIFIED_NODE_SIZE = 48;

export interface GraphFindInPageProps {
  nodes: NodeViewModel[];
}

export const GraphFindInPage = ({ nodes }: GraphFindInPageProps) => {
  const { euiTheme } = useEuiTheme();
  const { searchQuery, setSearchQuery, entityFilters, setSearchHighlight } =
    useGraphSearchContext();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isFocused, setIsFocused] = React.useState(false);
  const roundStartedRef = useRef(false);
  const searchResultsRef = useRef<NodeViewModel[]>([]);
  const { setCenter, getNode } = useReactFlow();

  const searchResults = useMemo(
    () => getFindInPageMatches(nodes, searchQuery, entityFilters),
    [nodes, searchQuery, entityFilters]
  );

  searchResultsRef.current = searchResults;

  useEffect(() => {
    setSelectedIndex(0);
    roundStartedRef.current = false;
  }, [searchQuery, entityFilters]);

  useEffect(() => {
    setSelectedIndex((idx) =>
      searchResults.length === 0 ? 0 : Math.min(idx, searchResults.length - 1)
    );
  }, [searchResults.length]);

  const matchNodeIds = useMemo(
    () => new Set(searchResults.map((node) => node.id)),
    [searchResults]
  );

  useEffect(() => {
    if (isFocused && searchQuery.trim() && searchResults.length > 0) {
      setSearchHighlight({
        matchNodeIds,
        activeMatchNodeId: searchResults[selectedIndex]?.id ?? null,
      });
      return;
    }

    setSearchHighlight({ matchNodeIds: new Set(), activeMatchNodeId: null });
  }, [isFocused, matchNodeIds, searchQuery, searchResults, selectedIndex, setSearchHighlight]);

  const centerMapOnNode = useCallback(
    (node: NodeViewModel) => {
      const flowNode = getNode(node.id);
      if (!flowNode) {
        return;
      }

      const width = flowNode.measured?.width ?? SIMPLIFIED_NODE_SIZE;
      const height = flowNode.measured?.height ?? SIMPLIFIED_NODE_SIZE;
      const centerX = flowNode.position.x + width / 2;
      const centerY = flowNode.position.y + height / 2;

      setCenter(centerX, centerY, {
        zoom: CENTER_ZOOM,
        duration: CENTER_ANIMATION_DURATION_MS,
      });
    },
    [getNode, setCenter]
  );

  const goToNextMatch = useCallback(() => {
    setSelectedIndex((idx) => {
      const currentMatches = searchResultsRef.current;
      const len = currentMatches.length;
      if (len === 0) {
        return idx;
      }

      if (!roundStartedRef.current) {
        roundStartedRef.current = true;
        const first = currentMatches[0];
        if (first) {
          centerMapOnNode(first);
        }
        return 0;
      }

      const nextIdx = (idx + 1) % len;
      const nextNode = currentMatches[nextIdx];
      if (nextNode) {
        centerMapOnNode(nextNode);
      }
      return nextIdx;
    });
  }, [centerMapOnNode]);

  const goToPreviousMatch = useCallback(() => {
    setSelectedIndex((idx) => {
      const currentMatches = searchResultsRef.current;
      const len = currentMatches.length;
      if (len === 0) {
        return idx;
      }

      roundStartedRef.current = true;
      const prevIdx = (idx - 1 + len) % len;
      const node = currentMatches[prevIdx];
      if (node) {
        centerMapOnNode(node);
      }
      return prevIdx;
    });
  }, [centerMapOnNode]);

  const onSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const results = searchResultsRef.current;
      if (results.length === 0) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNextMatch();
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPreviousMatch();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        goToNextMatch();
      }
    },
    [goToNextMatch, goToPreviousMatch]
  );

  const matchesCounterLabel =
    searchResults.length > 0 ? `${selectedIndex + 1}/${searchResults.length}` : '0/0';

  const findInPageAppendCss = useMemo(
    () => css`
      .graphFindInPage__matchesCounter {
        font-variant-numeric: tabular-nums;
        padding-inline: ${euiTheme.size.xs};
      }

      .euiFormControlLayout__append {
        padding-inline-end: 0;
      }
    `,
    [euiTheme]
  );

  const shortcutHint = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <>
      <div css={findInPageAppendCss}>
        <EuiFieldSearch
          id={GRAPH_FIND_IN_PAGE_INPUT_ID}
          placeholder={i18n.translate(
            'securitySolutionPackages.csp.graph.controls.findInPagePlaceholder',
            {
              defaultMessage: 'Find in page ({shortcutHint})',
              values: { shortcutHint },
            }
          )}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={onSearchKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          fullWidth
          compressed
          isClearable
          incremental
          data-test-subj="graphFindInPageInput"
          aria-label={i18n.translate(
            'securitySolutionPackages.csp.graph.controls.findInPageAriaLabel',
            {
              defaultMessage:
                'Search entities on the graph. Up arrow or the previous button centers the graph on the previous match. Down arrow, Enter, or the next button centers the graph on the next match.',
            }
          )}
          append={
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
              <EuiFlexItem
                grow={false}
                className="graphFindInPage__matchesCounter"
                data-test-subj="graphFindMatchSummary"
                aria-live="polite"
              >
                <EuiText color="subdued" size="s">
                  {matchesCounterLabel}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowUp"
                  display="empty"
                  color="text"
                  size="s"
                  aria-label={i18n.translate(
                    'securitySolutionPackages.csp.graph.find.previousMatch',
                    {
                      defaultMessage: 'Go to previous match on the graph',
                    }
                  )}
                  onMouseDown={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    goToPreviousMatch();
                  }}
                  isDisabled={searchResults.length === 0}
                  data-test-subj="graphFindPrevious"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowDown"
                  display="empty"
                  color="text"
                  size="s"
                  aria-label={i18n.translate('securitySolutionPackages.csp.graph.find.nextMatch', {
                    defaultMessage: 'Go to next match on the graph',
                  })}
                  onMouseDown={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    goToNextMatch();
                  }}
                  isDisabled={searchResults.length === 0}
                  data-test-subj="graphFindNext"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </div>
      <EuiScreenReaderOnly>
        <div>
          <p>
            {searchQuery.trim() && searchResults.length === 0
              ? i18n.translate('securitySolutionPackages.csp.graph.controls.noResultsFound', {
                  defaultMessage: 'No entities found',
                })
              : null}
          </p>
          <p>
            {searchResults.length > 0 && searchResults[selectedIndex]
              ? i18n.translate('securitySolutionPackages.csp.graph.find.activeMatchName', {
                  defaultMessage: 'Active match: {name}',
                  values: {
                    name: String(
                      searchResults[selectedIndex].label ?? searchResults[selectedIndex].id
                    ),
                  },
                })
              : null}
          </p>
        </div>
      </EuiScreenReaderOnly>
    </>
  );
};

export const focusGraphFindInPageInput = (): void => {
  document.getElementById(GRAPH_FIND_IN_PAGE_INPUT_ID)?.focus();
};
