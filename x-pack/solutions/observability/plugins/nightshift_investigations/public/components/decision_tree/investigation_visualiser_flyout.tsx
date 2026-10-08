/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  useStore,
  type EdgeTypes,
  type ReactFlowState,
  type NodeChange,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EvidenceList } from '@kbn/investigation-output';
import type { InvestigationState } from '@kbn/significant-events-schema';
import {
  buildDecisionGraph,
  DECISION_TREE_NODE_IDS,
  getPathToNode,
  type DecisionTreeNodeData,
  type DecisionTreeTrigger,
} from './build_decision_graph';
import { DECISION_TREE_ESTIMATED_NODE_HEIGHT, layoutDecisionGraph } from './layout_decision_graph';
import {
  DecisionTreeActionsContext,
  DecisionTreeNode,
  getTriggerTypeLabel,
  HypothesisStatusBadge,
  type DecisionTreeFlowNode,
} from './decision_tree_nodes';
import { DecisionTreeEdge, type DecisionTreeFlowEdge } from './decision_tree_edge';
import { getHypothesesAnalyzedLabel } from './decision_tree_card';

const nodeTypes: NodeTypes = { decisionTree: DecisionTreeNode };
const edgeTypes: EdgeTypes = { decisionTree: DecisionTreeEdge };

const FIT_VIEW_OPTIONS = { padding: 0.08, maxZoom: 1, duration: 300 } as const;
const DETAIL_PANEL_WIDTH = 380;
/** Gap React Flow's `Panel` leaves between the detail panel and the canvas edge. */
const DETAIL_PANEL_MARGIN = 15;
const CENTRE_DURATION_MS = 300;

const selectCanvasWidth = ({ width }: ReactFlowState): number => width;
const selectCanvasHeight = ({ height }: ReactFlowState): number => height;
const DIMMED_OPACITY = 0.45;

export const VISUALISER_TITLE = i18n.translate('xpack.nightshiftInvestigations.visualiser.title', {
  defaultMessage: 'Hypothesis Tree',
});

const previousActionLabel = i18n.translate(
  'xpack.nightshiftInvestigations.visualiser.detail.previousAction',
  { defaultMessage: 'Previous action' }
);
const nextActionLabel = i18n.translate(
  'xpack.nightshiftInvestigations.visualiser.detail.nextAction',
  { defaultMessage: 'Next action' }
);

const fitViewLabel = i18n.translate('xpack.nightshiftInvestigations.visualiser.fitView', {
  defaultMessage: 'Fit to view',
});
const enterFullScreenLabel = i18n.translate(
  'xpack.nightshiftInvestigations.visualiser.enterFullScreen',
  { defaultMessage: 'Full screen' }
);
const exitFullScreenLabel = i18n.translate(
  'xpack.nightshiftInvestigations.visualiser.exitFullScreen',
  { defaultMessage: 'Exit full screen' }
);

const closeDetailsLabel = i18n.translate('xpack.nightshiftInvestigations.visualiser.detail.close', {
  defaultMessage: 'Close details',
});

export interface InvestigationVisualiserFlyoutProps {
  trigger: DecisionTreeTrigger;
  state: InvestigationState;
  isRunning: boolean;
  /** History group shared with the investigation flyout, which Back returns to. */
  historyKey: symbol;
  onClose: () => void;
}

const getDetailTitle = (data: DecisionTreeNodeData): string => {
  switch (data.kind) {
    case 'trigger':
      return getTriggerTypeLabel(data.trigger.type);
    case 'hypothesis':
      return data.hypothesis.candidate;
    case 'conclusion':
      return i18n.translate('xpack.nightshiftInvestigations.visualiser.detail.conclusionTitle', {
        defaultMessage: 'Conclusion',
      });
    case 'actions':
      return i18n.translate('xpack.nightshiftInvestigations.visualiser.detail.actionTitle', {
        defaultMessage: 'Proposed action',
      });
    case 'hypotheses':
      return '';
    default: {
      const exhaustive: never = data;
      throw new Error(`Unhandled decision tree node: ${JSON.stringify(exhaustive)}`);
    }
  }
};

const NodeDetail = ({
  data,
  selectedActionIndex,
  onChangeAction,
}: {
  data: DecisionTreeNodeData;
  selectedActionIndex: number | null;
  onChangeAction: (index: number) => void;
}): React.ReactElement | null => {
  switch (data.kind) {
    case 'trigger':
      return (
        <EuiText size="s">
          <p>{data.trigger.name}</p>
        </EuiText>
      );
    case 'hypothesis': {
      const { status, confidence, reason, evidence } = data.hypothesis;
      return (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <HypothesisStatusBadge status={status} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.nightshiftInvestigations.visualiser.detail.confidence"
                  defaultMessage="Confidence {confidence, number, percent}"
                  values={{ confidence }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiMarkdownFormat textSize="s">
            {reason ??
              i18n.translate('xpack.nightshiftInvestigations.visualiser.detail.noReason', {
                defaultMessage: 'No reasoning recorded yet.',
              })}
          </EuiMarkdownFormat>
          {evidence?.length ? (
            <>
              <EuiSpacer size="m" />
              <EvidenceList evidence={evidence} />
            </>
          ) : null}
        </>
      );
    }
    case 'conclusion':
      return <EuiMarkdownFormat textSize="s">{data.conclusion}</EuiMarkdownFormat>;
    case 'actions': {
      const total = data.recommendations.length;
      const index = Math.min(selectedActionIndex ?? 0, total - 1);
      const { title, confidence, description, code } = data.recommendations[index];
      return (
        <>
          {total > 1 && (
            <>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="flexEnd"
                gutterSize="xs"
                responsive={false}
                data-test-subj="nightshiftInvestigationVisualiserActionPager"
              >
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={previousActionLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="chevronSingleLeft"
                      color="text"
                      aria-label={previousActionLabel}
                      isDisabled={index === 0}
                      onClick={() => onChangeAction(index - 1)}
                      data-test-subj="nightshiftInvestigationVisualiserActionPrevious"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <FormattedMessage
                      id="xpack.nightshiftInvestigations.visualiser.detail.actionPosition"
                      defaultMessage="{current} of {total}"
                      values={{ current: index + 1, total }}
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={nextActionLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="chevronSingleRight"
                      color="text"
                      aria-label={nextActionLabel}
                      isDisabled={index === total - 1}
                      onClick={() => onChangeAction(index + 1)}
                      data-test-subj="nightshiftInvestigationVisualiserActionNext"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </>
          )}
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.nightshiftInvestigations.visualiser.detail.actionConfidence"
              defaultMessage="Confidence {confidence, number, percent}"
              values={{ confidence }}
            />
          </EuiText>
          {description && (
            <>
              <EuiSpacer size="m" />
              <EuiMarkdownFormat textSize="s">{description}</EuiMarkdownFormat>
            </>
          )}
          {code && (
            <>
              <EuiSpacer size="m" />
              <EuiCodeBlock language="shell" isCopyable fontSize="s" paddingSize="s">
                {code}
              </EuiCodeBlock>
            </>
          )}
        </>
      );
    }
    case 'hypotheses':
      return null;
    default: {
      const exhaustive: never = data;
      throw new Error(`Unhandled decision tree node: ${JSON.stringify(exhaustive)}`);
    }
  }
};

const DecisionTreeCanvas = ({
  trigger,
  state,
  isRunning,
  isFullScreen,
  onToggleFullScreen,
}: Omit<InvestigationVisualiserFlyoutProps, 'historyKey' | 'onClose'> & {
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}): React.ReactElement => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { fitView, getZoom, setCenter } = useReactFlow();
  const canvasWidth = useStore(selectCanvasWidth);
  const canvasHeight = useStore(selectCanvasHeight);
  const [isHypothesesExpanded, setIsHypothesesExpanded] = useState(true);
  // Collapsed to a stack fronted by the highest-confidence action.
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const [nodes, setNodes, onNodesChange] = useNodesState<DecisionTreeFlowNode>([]);

  const graph = useMemo(
    () =>
      buildDecisionGraph({ trigger, state, isRunning, isHypothesesExpanded, isActionsExpanded }),
    [trigger, state, isRunning, isHypothesesExpanded, isActionsExpanded]
  );
  const positioned = useMemo(
    () => layoutDecisionGraph(graph, measuredHeights),
    [graph, measuredHeights]
  );

  const selectedNode = graph.nodes.find(({ id }) => id === selectedNodeId);
  const selectedPath = useMemo(
    () => (selectedNode ? getPathToNode(graph.edges, selectedNode.id) : undefined),
    [graph.edges, selectedNode]
  );

  useEffect(() => {
    // Spread the previous node so React Flow keeps its measured size instead of re-measuring.
    setNodes((previous) => {
      const previousById = new Map(previous.map((node) => [node.id, node]));
      return positioned.map(({ id, data, position }) => ({
        ...previousById.get(id),
        id,
        type: 'decisionTree' as const,
        position,
        draggable: false,
        connectable: false,
        data: {
          ...data,
          isSelected: id === selectedNode?.id,
          isDimmed: selectedPath !== undefined && !selectedPath.nodeIds.has(id),
          selectedActionIndex:
            id === DECISION_TREE_NODE_IDS.actions && id === selectedNode?.id
              ? selectedActionIndex
              : null,
        },
      }));
    });
  }, [positioned, selectedActionIndex, selectedNode?.id, selectedPath, setNodes]);

  const edges = useMemo<DecisionTreeFlowEdge[]>(
    () =>
      graph.edges.map(({ id, source, target, isHappyPath }) => {
        const isHighlighted = selectedPath?.edgeIds.has(id) ?? false;
        const stroke = isHappyPath
          ? euiTheme.colors.borderStrongSuccess
          : isHighlighted
          ? euiTheme.colors.borderStrongPrimary
          : euiTheme.colors.borderBaseProminent;
        return {
          id,
          source,
          target,
          type: 'decisionTree',
          animated: isRunning,
          zIndex: 0,
          style: {
            stroke,
            strokeWidth: isHappyPath || isHighlighted ? 2 : 1.5,
            opacity: selectedPath && !isHighlighted ? DIMMED_OPACITY : 1,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 },
        };
      }),
    [euiTheme.colors, graph.edges, isRunning, selectedPath]
  );

  const handleNodesChange = useCallback(
    (changes: Array<NodeChange<DecisionTreeFlowNode>>) => {
      onNodesChange(changes);
      const measured: Record<string, number> = {};
      changes.forEach((change) => {
        if (change.type === 'dimensions' && change.dimensions) {
          measured[change.id] = change.dimensions.height;
        }
      });
      if (Object.keys(measured).length === 0) {
        return;
      }
      setMeasuredHeights((previous) =>
        Object.entries(measured).every(([id, height]) => Math.abs((previous[id] ?? 0) - height) < 1)
          ? previous
          : { ...previous, ...measured }
      );
    },
    [onNodesChange]
  );

  const layoutKey = `${graph.nodes.map(({ id }) => id).join('|')}#${JSON.stringify(
    measuredHeights
  )}`;
  useEffect(() => {
    // Waits for React Flow to measure the new nodes before fitting them. Also refits when the
    // canvas resizes (full screen, flyout resize) so no node is left out of view.
    void fitView(FIT_VIEW_OPTIONS);
  }, [layoutKey, canvasWidth, canvasHeight, fitView]);

  const fitAll = useCallback(() => void fitView(FIT_VIEW_OPTIONS), [fitView]);

  const centreOnNode = useCallback(
    (nodeId: string) => {
      const node = positioned.find(({ id }) => id === nodeId);
      if (!node) {
        return;
      }
      const zoom = getZoom();
      const height = measuredHeights[nodeId] ?? DECISION_TREE_ESTIMATED_NODE_HEIGHT[node.data.kind];
      // The detail panel overlays the left of the canvas, so centre in the strip to its right when
      // the canvas is wide enough to leave one; otherwise centre on the whole canvas.
      const panelSpace = DETAIL_PANEL_WIDTH + DETAIL_PANEL_MARGIN;
      const hasFreeStrip = canvasWidth - panelSpace >= node.width * zoom + DETAIL_PANEL_MARGIN * 2;
      const detailPanelOffset = hasFreeStrip ? panelSpace / 2 / zoom : 0;
      void setCenter(
        node.position.x + node.width / 2 - detailPanelOffset,
        node.position.y + height / 2,
        { zoom, duration: CENTRE_DURATION_MS }
      );
    },
    [canvasWidth, getZoom, measuredHeights, positioned, setCenter]
  );

  const handleNodeClick: NodeMouseHandler<DecisionTreeFlowNode> = useCallback(
    (_, { id, data }) => {
      if (data.kind === 'hypotheses') {
        setIsHypothesesExpanded((expanded) => !expanded);
        return;
      }
      if (selectedNodeId === id) {
        setSelectedNodeId(null);
        return;
      }
      setSelectedNodeId(id);
      setSelectedActionIndex(data.kind === 'actions' ? 0 : null);
      centreOnNode(id);
    },
    [centreOnNode, selectedNodeId]
  );

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedActionIndex(null);
  }, []);

  const changeAction = useCallback((index: number) => {
    setSelectedActionIndex(index);
    // A collapsed stack only shows the first action, so reveal the one being viewed.
    if (index > 0) {
      setIsActionsExpanded(true);
    }
  }, []);

  const actionsContext = useMemo(
    () => ({
      onSelectAction: (index: number) => {
        if (selectedNodeId === DECISION_TREE_NODE_IDS.actions && selectedActionIndex === index) {
          clearSelection();
          return;
        }
        if (selectedNodeId !== DECISION_TREE_NODE_IDS.actions) {
          centreOnNode(DECISION_TREE_NODE_IDS.actions);
        }
        setSelectedNodeId(DECISION_TREE_NODE_IDS.actions);
        changeAction(index);
      },
      onToggleActionsExpanded: () => setIsActionsExpanded((expanded) => !expanded),
    }),
    [centreOnNode, changeAction, clearSelection, selectedActionIndex, selectedNodeId]
  );

  return (
    <DecisionTreeActionsContext.Provider value={actionsContext}>
      <ReactFlow<DecisionTreeFlowNode, DecisionTreeFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={clearSelection}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.2}
        maxZoom={1}
        colorMode={colorMode === 'DARK' ? 'dark' : 'light'}
        proOptions={{ hideAttribution: true }}
        data-test-subj="nightshiftInvestigationVisualiserCanvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          bgColor={euiTheme.colors.backgroundBaseSubdued}
          color={euiTheme.colors.borderBaseProminent}
          gap={16}
          size={1}
        />
        <Controls showInteractive={false} showFitView={false} position="bottom-right">
          <ControlButton
            onClick={fitAll}
            title={fitViewLabel}
            aria-label={fitViewLabel}
            data-test-subj="nightshiftInvestigationVisualiserFitView"
          >
            <EuiIcon type="bullseye" size="s" aria-hidden={true} />
          </ControlButton>
          <ControlButton
            onClick={onToggleFullScreen}
            title={isFullScreen ? exitFullScreenLabel : enterFullScreenLabel}
            aria-label={isFullScreen ? exitFullScreenLabel : enterFullScreenLabel}
            aria-pressed={isFullScreen}
            data-test-subj="nightshiftInvestigationVisualiserFullScreen"
          >
            <EuiIcon
              type={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
              size="s"
              aria-hidden={true}
            />
          </ControlButton>
        </Controls>
        {isRunning && (
          <Panel position="top-right">
            <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    {i18n.translate('xpack.nightshiftInvestigations.visualiser.investigating', {
                      defaultMessage: 'Investigating…',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </Panel>
        )}
        {selectedNode && selectedNode.data.kind !== 'hypotheses' && (
          <Panel position="top-left">
            <EuiPanel
              hasShadow
              paddingSize="m"
              data-test-subj="nightshiftInvestigationVisualiserDetail"
              css={css`
                width: ${DETAIL_PANEL_WIDTH}px;
                max-height: calc(100vh - ${euiTheme.size.xxxxl} * 4);
                overflow-y: auto;
              `}
            >
              <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h3>{getDetailTitle(selectedNode.data)}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={closeDetailsLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="cross"
                      color="text"
                      aria-label={closeDetailsLabel}
                      onClick={clearSelection}
                      data-test-subj="nightshiftInvestigationVisualiserDetailClose"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <div
                css={css`
                  .euiCodeBlock__code,
                  .euiCodeBlock__line,
                  .euiCodeBlock__lineText,
                  pre code,
                  code[data-code-language] {
                    font-family: ${euiTheme.font.familyCode};
                    color: ${euiTheme.colors.textParagraph};
                  }
                `}
              >
                <NodeDetail
                  data={selectedNode.data}
                  selectedActionIndex={selectedActionIndex}
                  onChangeAction={changeAction}
                />
              </div>
            </EuiPanel>
          </Panel>
        )}
      </ReactFlow>
    </DecisionTreeActionsContext.Provider>
  );
};

/**
 * Draws the investigation as a decision tree in a half-screen push flyout. It opens as a new main
 * flyout in the investigation flyout's history group, so the flyout menu offers Back to it.
 */
export function InvestigationVisualiserFlyout({
  trigger,
  state,
  isRunning,
  historyKey,
  onClose,
}: InvestigationVisualiserFlyoutProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const toggleFullScreen = useCallback(() => setIsFullScreen((fullScreen) => !fullScreen), []);
  const exitFullScreen = useCallback(() => setIsFullScreen(false), []);

  // EUI caps managed flyouts at 90% width and their `perspective` traps fixed-position children,
  // so full screen moves the canvas into a body-level layer. Rendering it through a portal into a
  // host element that is re-parented keeps the React tree, and so the canvas state, intact.
  const [canvasHost] = useState(() => {
    const host = document.createElement('div');
    host.style.width = '100%';
    host.style.height = '100%';
    return host;
  });
  const [flyoutSlot, setFlyoutSlot] = useState<HTMLDivElement | null>(null);
  const [fullScreenSlot, setFullScreenSlot] = useState<HTMLDivElement | null>(null);
  // EuiPortal mounts its children after this component's effects, so focus once the button exists.
  const focusOnMount = useCallback((button: HTMLButtonElement | null) => button?.focus(), []);

  useLayoutEffect(() => {
    const slot = isFullScreen ? fullScreenSlot : flyoutSlot;
    if (slot && canvasHost.parentElement !== slot) {
      slot.appendChild(canvasHost);
    }
  }, [canvasHost, flyoutSlot, fullScreenSlot, isFullScreen]);

  useEffect(() => {
    if (!isFullScreen) {
      return;
    }
    // Captured on window so Escape leaves full screen instead of reaching the flyout and closing it.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isFullScreen]);

  const hypothesesAnalyzedLabel = getHypothesesAnalyzedLabel(state.hypotheses.length);

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby="nightshiftInvestigationVisualiserFlyoutTitle"
        data-test-subj="nightshiftInvestigationVisualiserFlyout"
        session="start"
        historyKey={historyKey}
        flyoutMenuProps={{ title: VISUALISER_TITLE, hideTitle: true }}
        type="push"
        size="m"
        resizable
      >
        <EuiFlyoutHeader>
          <EuiTitle size="s">
            <h2 id="nightshiftInvestigationVisualiserFlyoutTitle">{VISUALISER_TITLE}</h2>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {hypothesesAnalyzedLabel}
          </EuiText>
        </EuiFlyoutHeader>
        <div
          ref={setFlyoutSlot}
          css={css`
            flex: 1 1 auto;
            min-block-size: 0;
            position: relative;
            margin: ${euiTheme.size.base};
            border: ${euiTheme.border.thin};
            border-radius: ${euiTheme.border.radius.medium};
            overflow: hidden;
          `}
        />
      </EuiFlyout>
      {isFullScreen && (
        <EuiPortal>
          <div
            role="dialog"
            aria-modal={true}
            aria-labelledby="nightshiftInvestigationVisualiserFullScreenTitle"
            data-test-subj="nightshiftInvestigationVisualiserFullScreenLayer"
            css={css`
              position: fixed;
              inset: 0;
              z-index: ${euiTheme.levels.modal};
              display: flex;
              flex-direction: column;
              background: ${euiTheme.colors.backgroundBasePlain};
            `}
          >
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="m"
              responsive={false}
              css={css`
                flex: 0 0 auto;
                padding: ${euiTheme.size.m} ${euiTheme.size.l};
                border-bottom: ${euiTheme.border.thin};
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2 id="nightshiftInvestigationVisualiserFullScreenTitle">{VISUALISER_TITLE}</h2>
                </EuiTitle>
                <EuiText size="xs" color="subdued">
                  {hypothesesAnalyzedLabel}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={exitFullScreenLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    buttonRef={focusOnMount}
                    iconType="fullScreenExit"
                    color="text"
                    aria-label={exitFullScreenLabel}
                    onClick={exitFullScreen}
                    data-test-subj="nightshiftInvestigationVisualiserExitFullScreen"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div
              ref={setFullScreenSlot}
              css={css`
                flex: 1 1 auto;
                min-block-size: 0;
                position: relative;
              `}
            />
          </div>
        </EuiPortal>
      )}
      {createPortal(
        <ReactFlowProvider>
          <DecisionTreeCanvas
            trigger={trigger}
            state={state}
            isRunning={isRunning}
            isFullScreen={isFullScreen}
            onToggleFullScreen={toggleFullScreen}
          />
        </ReactFlowProvider>,
        canvasHost
      )}
    </>
  );
}
