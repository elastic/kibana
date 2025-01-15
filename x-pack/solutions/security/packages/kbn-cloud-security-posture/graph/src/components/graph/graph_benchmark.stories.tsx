/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css, ThemeProvider } from '@emotion/react';
import { Story } from '@storybook/react';
import { EuiListGroup, EuiHorizontalRule } from '@elastic/eui';
import type { NodeProps, NodeViewModel } from '..';
import { Graph } from '..';
import { GraphPopover } from './graph_popover';
import { ExpandButtonClickCallback } from '../types';
import { useGraphPopover } from './use_graph_popover';
import { ExpandPopoverListItem } from '../styles';
import largeGraph from '../mock/large_graph.json';
import { GraphPerfMonitor } from './graph_perf_monitor';

export default {
  title: 'Graph Benchmark',
  description: 'CDR - Graph visualization',
  argTypes: {},
};

const useExpandButtonPopover = () => {
  const { id, state, actions } = useGraphPopover('node-expand-popover');
  const { openPopover, closePopover } = actions;

  const selectedNode = useRef<NodeProps | null>(null);
  const unToggleCallbackRef = useRef<(() => void) | null>(null);
  const [pendingOpen, setPendingOpen] = useState<{
    node: NodeProps;
    el: HTMLElement;
    unToggleCallback: () => void;
  } | null>(null);

  const onNodeExpandButtonClick: ExpandButtonClickCallback = useCallback(
    (e, node, unToggleCallback) => {
      const lastPopoverId = selectedNode.current?.id;

      // If the same node is clicked again, close the popover
      selectedNode.current = null;
      unToggleCallbackRef.current?.();
      unToggleCallbackRef.current = null;
      closePopover();

      if (lastPopoverId !== node.id) {
        // Set the pending open state
        setPendingOpen({ node, el: e.currentTarget, unToggleCallback });
      }
    },
    [closePopover]
  );

  useEffect(() => {
    if (!state.isOpen && pendingOpen) {
      const { node, el, unToggleCallback } = pendingOpen;

      selectedNode.current = node;
      unToggleCallbackRef.current = unToggleCallback;
      openPopover(el);

      setPendingOpen(null);
    }
  }, [state.isOpen, pendingOpen, openPopover]);

  const closePopoverHandler = useCallback(() => {
    selectedNode.current = null;
    unToggleCallbackRef.current?.();
    unToggleCallbackRef.current = null;
    closePopover();
  }, [closePopover]);

  // eslint-disable-next-line react/display-name
  const PopoverComponent = memo(() => (
    <GraphPopover
      panelPaddingSize="s"
      anchorPosition="rightCenter"
      isOpen={state.isOpen}
      anchorElement={state.anchorElement}
      closePopover={closePopoverHandler}
    >
      <EuiListGroup color="primary" gutterSize="none" bordered={false} flush={true}>
        <ExpandPopoverListItem
          iconType="visTagCloud"
          label="Explore related entities"
          onClick={() => {}}
        />
        <ExpandPopoverListItem
          iconType="users"
          label="Show actions by this entity"
          onClick={() => {}}
        />
        <ExpandPopoverListItem
          iconType="storage"
          label="Show actions on this entity"
          onClick={() => {}}
        />
        <EuiHorizontalRule margin="xs" />
        <ExpandPopoverListItem iconType="expand" label="View entity details" onClick={() => {}} />
      </EuiListGroup>
    </GraphPopover>
  ));

  const actionsWithClose = useMemo(
    () => ({
      ...actions,
      closePopover: closePopoverHandler,
    }),
    [actions, closePopoverHandler]
  );

  return useMemo(
    () => ({
      onNodeExpandButtonClick,
      Popover: PopoverComponent,
      id,
      actions: actionsWithClose,
      state,
    }),
    [PopoverComponent, actionsWithClose, id, onNodeExpandButtonClick, state]
  );
};

const useNodePopover = () => {
  const { id, state, actions } = useGraphPopover('node-popover');

  // eslint-disable-next-line react/display-name
  const PopoverComponent = memo(() => (
    <GraphPopover
      panelPaddingSize="s"
      anchorPosition="upCenter"
      isOpen={state.isOpen}
      anchorElement={state.anchorElement}
      closePopover={actions.closePopover}
    >
      {'TODO'}
    </GraphPopover>
  ));

  return useMemo(
    () => ({
      onNodeClick: (e: React.MouseEvent<HTMLElement>) => actions.openPopover(e.currentTarget),
      Popover: PopoverComponent,
      id,
      actions,
      state,
    }),
    [PopoverComponent, actions, id, state]
  );
};

const Template: Story = () => {
  const expandNodePopover = useExpandButtonPopover();
  const nodePopover = useNodePopover();
  const popovers = [expandNodePopover, nodePopover];
  const isPopoverOpen = popovers.some((popover) => popover.state.isOpen);

  const popoverOpenWrapper = useCallback((cb: Function, ...args: unknown[]) => {
    [expandNodePopover.actions.closePopover, nodePopover.actions.closePopover].forEach(
      (closePopover) => {
        closePopover();
      }
    );
    cb(...args);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expandButtonClickHandler = useCallback(
    (...args: unknown[]) => popoverOpenWrapper(expandNodePopover.onNodeExpandButtonClick, ...args),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const nodeClickHandler = useCallback(
    (...args: unknown[]) => popoverOpenWrapper(nodePopover.onNodeClick, ...args),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const nodes = useMemo(() => {
    return largeGraph.nodes.map((node) => {
      // @ts-expect-error
      const nodeViewModel: NodeViewModel = { ...node };
      if (nodeViewModel.shape !== 'group') {
        nodeViewModel.nodeClick = nodeClickHandler;
        nodeViewModel.expandButtonClick = expandButtonClickHandler;
      }

      return nodeViewModel;
    });
  }, [expandButtonClickHandler, nodeClickHandler]);

  return (
    <ThemeProvider theme={{ darkMode: false }}>
      <GraphPerfMonitor />
      <Graph
        css={css`
          height: 100%;
          width: 100%;
        `}
        nodes={nodes}
        // @ts-expect-error
        edges={largeGraph.edges}
        interactive={true}
        isLocked={isPopoverOpen}
      />
      {popovers?.map((popover) => popover.Popover && <popover.Popover key={popover.id} />)}
    </ThemeProvider>
  );
};

export const LargeGraphWithPopovers = Template.bind({});
