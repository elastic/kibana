/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef, KeyboardEvent, useMemo } from 'react';
import {
  EuiTreeView,
  EuiText,
  EuiI18n,
  EuiScreenReaderOnly,
  EuiBadge,
  keys,
  EuiLoadingSpinner,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
// @ts-expect-error style types not defined, but they exist
import { euiTreeViewStyles } from '@elastic/eui/lib/components/tree_view/tree_view.styles';

import {
  TREE_NAVIGATION_LOADING,
  TREE_NAVIGATION_EMPTY,
  TREE_NAVIGATION_SHOW_MORE,
} from '../../../../common/translations';
import { useFetchDynamicTreeView } from './hooks';
import { useStyles } from './styles';
import { disableEventDefaults, focusNextElement } from './helpers';
import { useTreeViewContext } from '../contexts';
import { TreeViewIcon } from '../tree_view_icon';
import type { DynamicTreeViewProps, DynamicTreeViewItemProps } from './types';
import { BREADCRUMBS_CLUSTER_TREE_VIEW_LEVELS } from '../translations';

const BUTTON_TEST_ID = 'kubernetesSecurity:dynamicTreeViewButton';

const focusNextButton = (event: KeyboardEvent) => {
  focusNextElement(event, `[data-test-subj="${BUTTON_TEST_ID}"]`, 'next');
};
const focusPreviousButton = (event: KeyboardEvent) => {
  focusNextElement(event, `[data-test-subj="${BUTTON_TEST_ID}"]`, 'prev');
};

const DynamicTreeViewExpander = ({
  defaultExpanded = false,
  children,
}: {
  defaultExpanded: boolean;
  children: (childrenProps: { isExpanded: boolean; onToggleExpand: () => void }) => JSX.Element;
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const onToggleExpand = () => {
    setIsExpanded((e) => !e);
  };

  return children({
    isExpanded,
    onToggleExpand,
  });
};

export const DynamicTreeView = ({
  tree,
  depth = 0,
  selectionDepth = {},
  query,
  onSelect,
  selected = '',
  expanded = true,
  onKeyDown,
}: DynamicTreeViewProps) => {
  const styles = useStyles(depth);
  const euiStyles = euiTreeViewStyles(useEuiTheme());
  const euiTreeViewCss = [euiStyles.euiTreeView, euiStyles.default];

  const { indexPattern, setNoResults, setTreeNavSelection } = useTreeViewContext();

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading } =
    useFetchDynamicTreeView(query, tree[depth].key, indexPattern, expanded);

  const onLoadMoreKeydown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case keys.ARROW_DOWN: {
        focusNextButton(event);
        break;
      }
      case keys.ARROW_UP: {
        focusPreviousButton(event);
        break;
      }
      case keys.ARROW_RIGHT: {
        disableEventDefaults(event);
        fetchNextPage();
      }
    }
  };

  useEffect(() => {
    if (depth === 0 && data) {
      const noData = data.pages?.[0].buckets.length === 0;
      setNoResults(noData);

      if (noData) {
        setTreeNavSelection({});
      }
    }
  }, [data, depth, setNoResults, setTreeNavSelection]);

  useEffect(() => {
    if (expanded) {
      fetchNextPage();
    }
  }, [fetchNextPage, expanded]);

  useEffect(() => {
    if (!selected && !depth && data && data.pages?.[0].buckets?.[0]?.key) {
      onSelect(
        {},
        tree[depth].type,
        data.pages[0].buckets[0].key,
        data.pages[0].buckets[0].key_as_string
      );
    }
  }, [data, depth, selected, onSelect, tree]);

  const onClickNextPageHandler = () => {
    fetchNextPage();
  };

  const itemList = useMemo(() => {
    return (
      data?.pages
        ?.map((aggsData) => {
          return aggsData?.buckets;
        })
        .flat() || []
    );
  }, [data?.pages]);

  return (
    <EuiText size="s" css={styles.euiTreeViewWrapper} hidden={!expanded} onKeyDown={onKeyDown}>
      {depth === 0 && (
        <EuiI18n
          token="euiTreeView.listNavigationInstructions"
          default="You can quickly navigate this list using arrow keys."
        >
          {(listNavigationInstructions: string) => (
            <EuiScreenReaderOnly>
              <p id="dynamicTreeViewInstructionId">{listNavigationInstructions}</p>
            </EuiScreenReaderOnly>
          )}
        </EuiI18n>
      )}
      <ul
        css={euiTreeViewCss}
        aria-describedby={data?.pages?.length ? 'dynamicTreeViewInstructionId' : undefined}
      >
        {isLoading && (
          <EuiTreeView.Item
            id="dynamicTreeViewLoading"
            css={styles.nonInteractiveItem}
            icon={<EuiLoadingSpinner size="s" />}
            label={TREE_NAVIGATION_LOADING}
          />
        )}
        {!isLoading && !itemList.length && (
          <EuiTreeView.Item
            id="dynamicTreeViewEmpty"
            css={styles.nonInteractiveItem}
            label={TREE_NAVIGATION_EMPTY}
          />
        )}
        {itemList.map((aggData) => {
          const queryFilter = {
            ...query,
            bool: {
              ...query.bool,
              filter: [...query.bool.filter, { term: { [tree[depth].key]: aggData.key } }],
            },
          };

          const defaultExpanded = selected.indexOf('' + aggData.key) > 0;

          return (
            <DynamicTreeViewExpander key={aggData.key} defaultExpanded={defaultExpanded}>
              {({ isExpanded, onToggleExpand }) => (
                <DynamicTreeViewItem
                  aggData={aggData}
                  depth={depth}
                  expanded={expanded}
                  isExpanded={isExpanded}
                  onSelect={onSelect}
                  onToggleExpand={onToggleExpand}
                  query={queryFilter}
                  selected={selected}
                  selectionDepth={selectionDepth}
                  tree={tree}
                />
              )}
            </DynamicTreeViewExpander>
          );
        })}
        {hasNextPage && (
          <EuiTreeView.Item
            id="dynamicTreeViewLoadMore"
            css={styles.loadMoreButton}
            aria-label={TREE_NAVIGATION_SHOW_MORE(tree[depth].namePlural)}
            data-test-subj={BUTTON_TEST_ID}
            onKeyDown={(event: React.KeyboardEvent) => onLoadMoreKeydown(event)}
            onClick={onClickNextPageHandler}
            label={
              <EuiBadge
                css={styles.loadMoreBadge}
                iconSide="right"
                iconType={isFetchingNextPage ? EuiLoadingSpinner : 'arrowDown'}
              >
                {isFetchingNextPage
                  ? TREE_NAVIGATION_LOADING
                  : TREE_NAVIGATION_SHOW_MORE(tree[depth].namePlural)}
              </EuiBadge>
            }
          />
        )}
      </ul>
    </EuiText>
  );
};

const DynamicTreeViewItem = ({
  depth,
  tree,
  onToggleExpand,
  onSelect,
  aggData,
  selectionDepth,
  isExpanded,
  selected,
  expanded,
  query,
}: DynamicTreeViewItemProps) => {
  const isLastNode = depth === tree.length - 1;
  const buttonRef = useRef<Record<string, any>>({});

  const handleSelect = () => {
    if (tree[depth].type === 'clusterId') {
      onSelect(selectionDepth, tree[depth].type, aggData.key, aggData.key_as_string);
    } else {
      onSelect(selectionDepth, tree[depth].type, aggData.key);
    }
  };

  const onKeyboardToggle = () => {
    if (!isLastNode) {
      onToggleExpand();
    }
    handleSelect();
  };

  const onButtonToggle = () => {
    if (!isLastNode) {
      onToggleExpand();
    }
    handleSelect();
  };

  // Enable keyboard navigation
  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case keys.ARROW_DOWN: {
        focusNextButton(event);
        break;
      }
      case keys.ARROW_UP: {
        focusPreviousButton(event);
        break;
      }
      case keys.ARROW_RIGHT: {
        if (!isExpanded && !isLastNode) {
          disableEventDefaults(event);
          onKeyboardToggle();
        }
        break;
      }
      case keys.ARROW_LEFT: {
        if (isExpanded) {
          disableEventDefaults(event);
          onKeyboardToggle();
        }
      }
      default:
        break;
    }
  };

  const onChildrenKeydown = (event: React.KeyboardEvent, key: string) => {
    if (event.key === keys.ARROW_LEFT) {
      disableEventDefaults(event);
      buttonRef.current[key].focus();
    }
  };

  const clusterLevel = BREADCRUMBS_CLUSTER_TREE_VIEW_LEVELS[tree[depth].type];

  return (
    <EuiTreeView.Item
      id={aggData.key_as_string || `${aggData.key}`}
      hasArrow={!isLastNode}
      isExpanded={isExpanded}
      onClick={onButtonToggle}
      onKeyDown={onKeyDown}
      icon={<TreeViewIcon {...tree[depth].iconProps} />}
      label={
        <EuiToolTip anchorClassName="eui-textTruncate" content={`${clusterLevel}: ${aggData.key}`}>
          <span>{aggData.key_as_string || aggData.key}</span>
        </EuiToolTip>
      }
      buttonRef={(el: HTMLButtonElement) => (buttonRef.current[aggData.key] = el)}
      data-test-subj={expanded ? BUTTON_TEST_ID : ''}
    >
      {!isLastNode && (
        <DynamicTreeView
          expanded={isExpanded}
          query={query}
          depth={depth + 1}
          selectionDepth={{
            ...selectionDepth,
            [tree[depth].type]: aggData.key,
            ...(tree[depth].type === 'clusterId' && {
              clusterName: aggData.key_as_string,
            }),
          }}
          tree={tree}
          onSelect={onSelect}
          selected={selected}
          onKeyDown={(event: React.KeyboardEvent) =>
            onChildrenKeydown(event, aggData.key.toString())
          }
        />
      )}
    </EuiTreeView.Item>
  );
};
