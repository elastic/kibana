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
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Feature } from '@kbn/significant-events-schema';
import { positionDetectionEntities, type DetectionModel } from './model';
import { labels } from './translations';
import { useViewportSpace } from './use_viewport_space';

const MIN_ZOOM = 0.1;
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
  selectedId: singleSelectedId,
  selectedIds,
  onSelect,
  onInspectFeature,
  height: fixedHeight,
  showLegend = true,
}: {
  model: DetectionModel;
  height?: number;
  showLegend?: boolean;
  title?: string;
  description?: string;
  selectedId?: string;
  selectedIds?: string[];
  onSelect: (id: string) => void;
  onInspectFeature: (feature: Feature) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const selection = new Set(selectedIds ?? (singleSelectedId ? [singleSelectedId] : []));
  const selectedId = selectedIds?.at(-1) ?? singleSelectedId;
  const markerId = useGeneratedHtmlId({ prefix: 'detectionTopologyArrow' });
  const [focus, setFocus] = useState(false);
  const [camera, setCamera] = useState<TopologyCamera>({ zoom: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const { ref: svgRef, height: availableHeight } = useViewportSpace<SVGSVGElement>(72);
  const [viewport, setViewport] = useState({ width: 960, height: 480 });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = svg.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setViewport((previous) =>
          previous.width === width && previous.height === height ? previous : { width, height }
        );
      }
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, [svgRef]);
  const dragRef = useRef<TopologyDrag>();
  const suppressClick = useRef(false);
  const lastFocus = useRef<string>();
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
  const columns = Math.max(3, Math.min(8, Math.floor(viewport.width / 220)));
  const layout = useMemo(
    () => positionDetectionEntities(model, columns, viewport.width / viewport.height),
    [model, columns, viewport.width, viewport.height]
  );
  const neighbors = new Set([
    ...selection,
    ...model.relationships
      .filter((edge) => selection.has(edge.source) || selection.has(edge.target))
      .flatMap((edge) => [edge.source, edge.target]),
  ]);
  const positions = new Map(layout.nodes.map((node) => [node.entity.id, node]));
  const viewWidth = viewport.width / camera.zoom;
  const viewHeight = viewport.height / camera.zoom;
  const fitCamera = useCallback(
    (ids: string[]): TopologyCamera => {
      const nodes = ids.length
        ? layout.nodes.filter((node) => ids.includes(node.entity.id))
        : layout.nodes;
      if (!nodes.length) return { zoom: 1, x: 0, y: 0 };
      const left = ids.length ? Math.min(...nodes.map((node) => node.x)) : 0;
      const right = ids.length ? Math.max(...nodes.map((node) => node.x + 184)) : layout.width;
      const top = ids.length ? Math.min(...nodes.map((node) => node.y)) : 0;
      const bottom = ids.length ? Math.max(...nodes.map((node) => node.y + 64)) : layout.height;
      return {
        zoom: Math.max(
          MIN_ZOOM,
          Math.min(
            MAX_ZOOM,
            viewport.width / Math.max(440, right - left + 120),
            viewport.height / Math.max(240, bottom - top + 120)
          )
        ),
        x: (left + right) / 2 - layout.width / 2,
        y: (top + bottom) / 2 - layout.height / 2,
      };
    },
    [layout, viewport]
  );
  const resetCamera = (): void => {
    cancelCameraAnimation();
    setCamera(fitCamera([]));
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

  const selectedKey = JSON.stringify([...selection].sort());
  useEffect(() => {
    const ids: string[] = JSON.parse(selectedKey);
    const target = fitCamera(ids);
    const focusKey = JSON.stringify([selectedKey, viewport, target]);
    if (lastFocus.current === focusKey) return;
    const initialFocus = lastFocus.current === undefined;
    lastFocus.current = focusKey;
    cancelCameraAnimation();
    if (
      initialFocus ||
      !ids.length ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
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
  }, [selectedKey, fitCamera, viewport, cancelCameraAnimation]);

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
  }, [zoomAt, svgRef]);

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
          padding: ${euiTheme.size.m} ${euiTheme.size.l};
          border-bottom: 1px solid ${euiTheme.colors.borderBasePlain};
        `}
      >
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>{title || labels.topology}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={description || labels.topologyDescription}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    data-test-subj="significantEventsAppDetectionTopologyButton"
                    iconType="iInCircle"
                    size="s"
                    aria-label={description || labels.topologyDescription}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
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
          style={{
            height:
              fixedHeight ?? (availableHeight !== undefined ? Math.max(280, availableHeight) : 480),
          }}
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
          {layout.islands.map((island) => {
            const namespace = island.namespace || labels.unknownNamespace;
            const related = !selection.size || island.entityIds.some((id) => neighbors.has(id));
            const accent =
              euiTheme.colors.vis[
                `euiColorVis${
                  [...namespace].reduce(
                    (hash, letter) => (hash * 31 + letter.charCodeAt(0)) % 65536,
                    0
                  ) % 8
                }` as keyof typeof euiTheme.colors.vis
              ];
            const namespaceCharacters = Math.max(8, Math.floor((island.width - 140) / 9));
            const serviceCount = i18n.translate(
              'xpack.significantEventsApp.detection.islandServices',
              {
                defaultMessage: '{count, plural, one {# service} other {# services}}',
                values: { count: island.entityIds.length },
              }
            );
            const focusLabel = i18n.translate(
              'xpack.significantEventsApp.detection.focusNamespace',
              {
                defaultMessage: 'Focus namespace {namespace}',
                values: { namespace },
              }
            );
            const focusIsland = (): void => {
              cancelCameraAnimation();
              setCamera(fitCamera(island.entityIds));
            };
            return (
              <g
                key={island.namespace}
                transform={`translate(${island.x}, ${island.y})`}
                opacity={focus && !related ? 0.3 : 1}
                data-test-subj="detectionTopologyNamespaceIsland"
              >
                <rect
                  width={island.width}
                  height={island.height}
                  rx="22"
                  fill={euiTheme.colors.backgroundBasePlain}
                  fillOpacity="0.7"
                  stroke={accent}
                  strokeOpacity="0.3"
                />
                <rect
                  width={island.width}
                  height={island.height}
                  rx="22"
                  fill={accent}
                  fillOpacity="0.025"
                />
                <path d={`M 24 54 H ${island.width - 24}`} stroke={accent} strokeOpacity="0.16" />
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={focusLabel}
                  onClick={focusIsland}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      focusIsland();
                    }
                  }}
                  css={css`
                    cursor: pointer;
                    &:focus-visible {
                      outline: 2px solid ${euiTheme.colors.primary};
                    }
                  `}
                >
                  <title>{focusLabel}</title>
                  <rect
                    x="16"
                    y="12"
                    width={island.width - 32}
                    height="34"
                    rx="8"
                    fill="transparent"
                  />
                  <circle cx="28" cy="31" r="4" fill={accent} />
                  <text
                    x="42"
                    y="36"
                    fontSize="16"
                    fontWeight="600"
                    fill={euiTheme.colors.text}
                    fontFamily={euiTheme.font.family}
                  >
                    {namespace.length > namespaceCharacters
                      ? `${namespace.slice(0, namespaceCharacters - 1)}…`
                      : namespace}
                  </text>
                  <text
                    x={island.width - 28}
                    y="35"
                    textAnchor="end"
                    fontSize="11"
                    fill={euiTheme.colors.textSubdued}
                    fontFamily={euiTheme.font.family}
                  >
                    {serviceCount}
                  </text>
                </g>
              </g>
            );
          })}
          {model.relationships.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            const related = selection.has(edge.source) || selection.has(edge.target);
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
            const selected = selection.has(entity.id);
            const activeRules = entity.queries.filter((query) => query.rule_backed).length;
            const openEvents = entity.events.filter((event) => event.status === 'active').length;
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
                aria-label={`${entity.label}, ${
                  entity.namespace || labels.unknownNamespace
                }, ${activeRules} ${labels.nodeRules}, ${openEvents} ${labels.nodeEvents}`}
                aria-pressed={selected}
                transform={`translate(${x}, ${y})`}
                onClick={() => {
                  onSelect(entity.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
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
                <title>{`${entity.label} · ${entity.namespace || labels.unknownNamespace}`}</title>
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
      {showLegend && (
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: ${euiTheme.size.s} ${euiTheme.size.l};
            border-top: 1px solid ${euiTheme.colors.borderBasePlain};
          `}
        >
          <EuiFlexGroup gutterSize="l" wrap>
            <EuiHealth color={euiTheme.colors.primary}>{labels.covered}</EuiHealth>
            <EuiHealth color={euiTheme.colors.mediumShade}>{labels.coverageGap}</EuiHealth>
            <EuiHealth color={euiTheme.colors.danger}>{labels.withEvents}</EuiHealth>
          </EuiFlexGroup>
          <EuiToolTip content={labels.graphHint} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="significantEventsAppDetectionTopologyButton"
              iconType="question"
              size="s"
              aria-label={labels.graphHint}
            />
          </EuiToolTip>
        </div>
      )}
    </EuiPanel>
  );
};
