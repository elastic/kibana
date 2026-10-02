/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Feature } from '@kbn/significant-events-schema';
import { positionDetectionEntities, type DetectionModel } from './model';
import { labels } from './translations';

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 4;
interface TopologyCamera {
  zoom: number;
  x: number;
  y: number;
}
interface TopologyDrag {
  pointerId: number;
  startX: number;
  startY: number;
  camera: TopologyCamera;
  inverse: DOMMatrix;
}

export const DetectionTopology = ({
  model,
  title,
  description,
  selectedId,
  onSelect,
  onInspectFeature,
}: {
  model: DetectionModel;
  title?: string;
  description?: string;
  selectedId?: string;
  onSelect: (id: string) => void;
  onInspectFeature: (feature: Feature) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const markerId = useGeneratedHtmlId({ prefix: 'detectionTopologyArrow' });
  const [focus, setFocus] = useState(false);
  const [camera, setCamera] = useState<TopologyCamera>({ zoom: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<TopologyDrag>();
  const suppressClick = useRef(false);
  const lastFocusedId = useRef<string>();
  const cameraRef = useRef(camera);
  const animationFrame = useRef<number>();
  const cancelCameraAnimation = useCallback((): void => {
    if (animationFrame.current !== undefined) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = undefined;
  }, []);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);
  useEffect(() => cancelCameraAnimation, [cancelCameraAnimation]);
  const layout = useMemo(() => positionDetectionEntities(model), [model]);
  const neighbors = new Set([
    selectedId,
    ...model.relationships
      .filter((edge) => edge.source === selectedId || edge.target === selectedId)
      .flatMap((edge) => [edge.source, edge.target]),
  ]);
  const positions = new Map(layout.nodes.map((node) => [node.entity.id, node]));
  const viewWidth = layout.width / camera.zoom;
  const viewHeight = layout.height / camera.zoom;
  const resetCamera = (): void => {
    cancelCameraAnimation();
    setCamera({ zoom: 1, x: 0, y: 0 });
  };
  const zoomAt = useCallback(
    (factor: number, anchor?: DOMPoint): void => {
      cancelCameraAnimation();
      setCamera((previous) => {
        const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, previous.zoom * factor));
        const ratio = 1 - previous.zoom / zoom;
        return {
          zoom,
          x: previous.x + (anchor ? (anchor.x - layout.width / 2 - previous.x) * ratio : 0),
          y: previous.y + (anchor ? (anchor.y - layout.height / 2 - previous.y) * ratio : 0),
        };
      });
    },
    [layout.width, layout.height, cancelCameraAnimation]
  );

  const centerEntity = useCallback(
    (id: string): void => {
      const node = layout.nodes.find((item) => item.entity.id === id);
      if (!node) return;
      const target = {
        zoom: Math.min(MAX_ZOOM, Math.max(1.7, Math.min(layout.width / 440, layout.height / 240))),
        x: node.x + 92 - layout.width / 2,
        y: node.y + 32 - layout.height / 2,
      };
      cancelCameraAnimation();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setCamera(target);
        return;
      }
      const initial = cameraRef.current;
      const startedAt = performance.now();
      const animate = (now: number): void => {
        const progress = Math.min(1, (now - startedAt) / 280);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCamera({
          zoom: initial.zoom + (target.zoom - initial.zoom) * eased,
          x: initial.x + (target.x - initial.x) * eased,
          y: initial.y + (target.y - initial.y) * eased,
        });
        animationFrame.current = progress < 1 ? requestAnimationFrame(animate) : undefined;
      };
      animationFrame.current = requestAnimationFrame(animate);
    },
    [layout, cancelCameraAnimation]
  );
  useEffect(() => {
    if (lastFocusedId.current === selectedId) return;
    lastFocusedId.current = selectedId;
    if (selectedId) centerEntity(selectedId);
    else {
      cancelCameraAnimation();
      setCamera({ zoom: 1, x: 0, y: 0 });
    }
  }, [selectedId, centerEntity, cancelCameraAnimation]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // A non-passive listener keeps wheel and trackpad zoom inside the map.
    const onWheel = (event: WheelEvent): void => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      event.preventDefault();
      const anchor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1;
      const delta = Math.max(-100, Math.min(100, event.deltaY * unit));
      zoomAt(Math.exp(-delta * 0.004), anchor);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const stopPanning = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = undefined;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <EuiPanel
      paddingSize="none"
      hasShadow={false}
      css={css`
        overflow: hidden;
        border: 1px solid ${euiTheme.colors.borderBasePlain};
        border-radius: ${euiTheme.border.radius.panel};
        background: ${euiTheme.colors.backgroundBasePlain};
      `}
    >
      <div
        css={css`
          padding: ${euiTheme.size.l};
          border-bottom: 1px solid ${euiTheme.colors.borderBasePlain};
        `}
      >
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>{title || labels.topology}</h2>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              <p>{description || labels.topologyDescription}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="significantEventsAppDetectionTopologyButton"
              size="xs"
              iconType="graphApp"
              isDisabled={!selectedId}
              onClick={() => setFocus(!focus)}
            >
              {focus ? labels.reset : labels.focus}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div
        css={css`
          position: relative;
          background-image: radial-gradient(${euiTheme.colors.borderBasePlain} 1px, transparent 1px),
            radial-gradient(
              ellipse at 48% 35%,
              color-mix(in srgb, ${euiTheme.colors.primary} 7%, transparent),
              transparent 65%
            );
          background-size: 20px 20px, 100% 100%;
          padding: ${euiTheme.size.s};
        `}
      >
        <svg
          data-test-subj="detectionTopology"
          role="group"
          aria-label={labels.graphLabel}
          ref={svgRef}
          tabIndex={0}
          viewBox={`${(layout.width - viewWidth) / 2 + camera.x} ${
            (layout.height - viewHeight) / 2 + camera.y
          } ${viewWidth} ${viewHeight}`}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            cancelCameraAnimation();
            const matrix = event.currentTarget.getScreenCTM();
            if (!matrix) return;
            suppressClick.current = false;
            dragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              camera,
              inverse: matrix.inverse(),
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (event.buttons === 0) {
              stopPanning(event);
              return;
            }
            const deltaX = event.clientX - drag.startX;
            const deltaY = event.clientY - drag.startY;
            if (!suppressClick.current && Math.hypot(deltaX, deltaY) < 4) return;
            suppressClick.current = true;
            setIsPanning(true);
            event.currentTarget.setPointerCapture(event.pointerId);
            const delta = new DOMPoint(deltaX, deltaY, 0, 0).matrixTransform(drag.inverse);
            setCamera({ ...drag.camera, x: drag.camera.x - delta.x, y: drag.camera.y - delta.y });
          }}
          onPointerUp={stopPanning}
          onPointerCancel={stopPanning}
          onLostPointerCapture={stopPanning}
          onClickCapture={(event) => {
            if (!suppressClick.current) return;
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            const directions: Record<string, readonly [number, number]> = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, -1],
              ArrowDown: [0, 1],
            };
            const direction = directions[event.key];
            if (direction) {
              cancelCameraAnimation();
              event.preventDefault();
              setCamera((previous) => ({
                ...previous,
                x: previous.x + direction[0] * viewWidth * 0.08,
                y: previous.y + direction[1] * viewHeight * 0.08,
              }));
            } else if (event.key === '+' || event.key === '=') {
              event.preventDefault();
              zoomAt(1.25);
            } else if (event.key === '-') {
              event.preventDefault();
              zoomAt(0.8);
            } else if (event.key === '0' || event.key === 'Home') {
              event.preventDefault();
              resetCamera();
            }
          }}
          css={css`
            width: 100%;
            display: block;
            touch-action: none;
            user-select: none;
            cursor: ${isPanning ? 'grabbing' : 'grab'};
            &:focus-visible {
              outline: 2px solid ${euiTheme.colors.primary};
              outline-offset: -2px;
            }
            min-height: 300px;
            max-height: 580px;
          `}
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={euiTheme.colors.primary} />
            </marker>
          </defs>
          {model.relationships.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            const related = edge.source === selectedId || edge.target === selectedId;
            const fromX = source.x + 184;
            const toX = target.x - 6;
            const bend = Math.max(25, (toX - fromX) / 2);
            const path = `M ${fromX} ${source.y + 32} C ${fromX + bend} ${source.y + 32}, ${
              toX - bend
            } ${target.y + 32}, ${toX} ${target.y + 32}`;
            return (
              <g
                key={edge.id}
                role="button"
                tabIndex={0}
                aria-label={
                  edge.features[0].title || `${source.entity.label} → ${target.entity.label}`
                }
                onClick={() => onInspectFeature(edge.features[0])}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onInspectFeature(edge.features[0]);
                  }
                }}
                opacity={focus && selectedId && !related ? 0.12 : related ? 1 : 0.5}
                css={css`
                  cursor: ${isPanning ? 'grabbing' : 'pointer'};
                  &:focus-visible {
                    outline: 2px solid ${euiTheme.colors.primary};
                  }
                `}
              >
                <title>{edge.features[0].title || labels.dependency}</title>
                <path d={path} fill="none" stroke="transparent" strokeWidth="16" />
                <path
                  d={path}
                  fill="none"
                  stroke={euiTheme.colors.primary}
                  strokeWidth={related ? 2.5 : 1.5}
                  strokeDasharray={related ? undefined : '5 4'}
                  markerEnd={`url(#${markerId})`}
                />
              </g>
            );
          })}
          {layout.nodes.map(({ entity, x, y }) => {
            const selected = entity.id === selectedId;
            const activeRules = entity.queries.filter((query) => query.rule_backed).length;
            const openEvents = entity.events.filter((event) => event.status === 'open').length;
            const color = openEvents
              ? euiTheme.colors.danger
              : activeRules
              ? euiTheme.colors.primary
              : euiTheme.colors.mediumShade;
            const nodeLabel =
              entity.label.length > 24 ? `${entity.label.slice(0, 22)}…` : entity.label;
            return (
              <g
                key={entity.id}
                role="button"
                tabIndex={0}
                aria-label={`${entity.label}, ${activeRules} ${labels.nodeRules}, ${openEvents} ${labels.nodeEvents}`}
                aria-pressed={selected}
                transform={`translate(${x}, ${y})`}
                onClick={() => {
                  centerEntity(entity.id);
                  onSelect(entity.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    centerEntity(entity.id);
                    onSelect(entity.id);
                  }
                }}
                opacity={focus && selectedId && !neighbors.has(entity.id) ? 0.22 : 1}
                css={css`
                  cursor: ${isPanning ? 'grabbing' : 'pointer'};
                  &:focus-visible {
                    outline: 2px solid ${euiTheme.colors.primary};
                    outline-offset: 4px;
                  }
                  &:hover rect {
                    stroke: ${euiTheme.colors.primary};
                  }
                  transition: opacity 180ms ease;
                  @media (prefers-reduced-motion: reduce) {
                    transition: none;
                  }
                `}
              >
                <title>{entity.label}</title>
                {selected && (
                  <rect
                    x="-5"
                    y="-5"
                    width="194"
                    height="74"
                    rx="15"
                    fill="none"
                    stroke={euiTheme.colors.primary}
                    opacity="0.22"
                    strokeWidth="5"
                  />
                )}
                <rect
                  width="184"
                  height="64"
                  rx="10"
                  fill={
                    selected
                      ? euiTheme.colors.backgroundBaseSubdued
                      : euiTheme.colors.backgroundBasePlain
                  }
                  stroke={selected ? euiTheme.colors.primary : euiTheme.colors.borderBasePlain}
                  strokeWidth={selected ? 2 : 1}
                />
                <circle cx="17" cy="20" r="4" fill={color} />
                <text
                  x="30"
                  y="24"
                  fill={euiTheme.colors.text}
                  fontSize="12"
                  fontWeight="600"
                  fontFamily={euiTheme.font.family}
                >
                  {nodeLabel}
                </text>
                <text
                  x="16"
                  y="47"
                  fill={euiTheme.colors.textSubdued}
                  fontSize="10"
                  fontFamily={euiTheme.font.family}
                >
                  {activeRules} {labels.nodeRules}
                  {openEvents
                    ? ` · ${openEvents} ${labels.nodeEvents}`
                    : ` · ${entity.subtype.replace(/_/g, ' ')}`}
                </text>
              </g>
            );
          })}
        </svg>
        <div
          css={css`
            position: absolute;
            right: ${euiTheme.size.m};
            bottom: ${euiTheme.size.m};
            display: flex;
            gap: ${euiTheme.size.xs};
            background: ${euiTheme.colors.backgroundBasePlain};
            border: 1px solid ${euiTheme.colors.borderBasePlain};
            border-radius: ${euiTheme.border.radius.medium};
            padding: ${euiTheme.size.xs};
          `}
        >
          <EuiToolTip content={labels.zoomIn} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="significantEventsAppDetectionTopologyButton"
              iconType="plus"
              aria-label={labels.zoomIn}
              onClick={() => zoomAt(1.25)}
              isDisabled={camera.zoom >= MAX_ZOOM}
            />
          </EuiToolTip>
          <EuiToolTip content={labels.zoomOut} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="significantEventsAppDetectionTopologyButton"
              iconType="minus"
              aria-label={labels.zoomOut}
              onClick={() => zoomAt(0.8)}
              isDisabled={camera.zoom <= MIN_ZOOM}
            />
          </EuiToolTip>
          <EuiToolTip content={labels.fit} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="significantEventsAppDetectionTopologyButton"
              iconType="fullScreen"
              aria-label={labels.fit}
              onClick={resetCamera}
            />
          </EuiToolTip>
        </div>
      </div>
      <div
        css={css`
          padding: ${euiTheme.size.m} ${euiTheme.size.l};
          border-top: 1px solid ${euiTheme.colors.borderBasePlain};
        `}
      >
        <EuiFlexGroup gutterSize="l" wrap>
          <EuiHealth color={euiTheme.colors.primary}>{labels.covered}</EuiHealth>
          <EuiHealth color={euiTheme.colors.mediumShade}>{labels.coverageGap}</EuiHealth>
          <EuiHealth color={euiTheme.colors.danger}>{labels.withEvents}</EuiHealth>
        </EuiFlexGroup>
        <EuiText size="xs" color="subdued">
          <p>{labels.graphHint}</p>
        </EuiText>
      </div>
    </EuiPanel>
  );
};
