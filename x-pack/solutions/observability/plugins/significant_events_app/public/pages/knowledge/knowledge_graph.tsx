/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSelect,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Feature } from '@kbn/significant-events-schema';
import type { DetectionModel } from '../detection/model';
import {
  buildKnowledgeGraph,
  knowledgeNodeRadius,
  type KnowledgeAssociation,
  type KnowledgeGraphLayout,
} from './knowledge_model';
import {
  reconcileKnowledgeParticles,
  stepKnowledgeGravity,
  type KnowledgeParticle,
} from './knowledge_gravity';
import { knowledgeLabels as text } from './translations';
import { journey } from '../detection/journey_translations';

const ripple = keyframes`from { opacity: .7; transform: scale(.6); } to { opacity: 0; transform: scale(3); }`;
const birth = keyframes`from { opacity: 0; } to { opacity: 1; }`;
interface Camera {
  x: number;
  y: number;
  zoom: number;
}
interface GraphDrag {
  pointerId: number;
  x: number;
  y: number;
  camera: Camera;
  nodeId?: string;
  moved: boolean;
}

export const KnowledgeGraph = ({
  features,
  associations,
  model,
  scopeKey,
  learning,
  onSelectService,
  onInspectFeature,
  focusedId,
  selectedId,
  simulation = false,
  simulationSpeed = 1,
  onSimulationComplete,
}: {
  features: Feature[];
  associations: Map<string, KnowledgeAssociation>;
  model: DetectionModel;
  scopeKey: string;
  learning: boolean;
  onSelectService: (id: string) => void;
  onInspectFeature: (feature: Feature) => void;
  focusedId?: string;
  selectedId?: string;
  simulation?: boolean;
  simulationSpeed?: number;
  onSimulationComplete?: () => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useGeneratedHtmlId({ prefix: 'knowledgeGalaxy' });
  const [viewport, setViewport] = useState({ width: 1200, height: 480 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const cameraValue = useRef(camera);
  cameraValue.current = camera;
  const cameraFrame = useRef(0);
  const cameraFocus = useRef<{ scope: string; main: string; clicked: string }>();
  const lastSelected = useRef<string>();
  const finalFocusFit = useRef<() => void>();
  useEffect(() => () => window.cancelAnimationFrame(cameraFrame.current), []);
  const cancelCameraFocus = useCallback(() => {
    window.cancelAnimationFrame(cameraFrame.current);
    cameraFocus.current = undefined;
  }, []);
  const [hovered, setHovered] = useState<string>();
  const hoverTimer = useRef<number>();
  const highlight = (id: string): void => {
    window.clearTimeout(hoverTimer.current);
    setHovered(id);
  };
  const clearHover = (): void => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(undefined), 2600);
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Feature[]>([]);
  const [panning, setPanning] = useState(false);
  const speed = useRef(simulationSpeed);
  speed.current = Math.max(0.5, Math.min(10, simulationSpeed));
  const latestFeatures = useRef(features);
  latestFeatures.current = features;
  const finishSimulation = useRef(onSimulationComplete);
  finishSimulation.current = onSimulationComplete;
  const particles = useRef(new Map<string, KnowledgeParticle>());
  const nodeElements = useRef(new Map<string, SVGGElement>());
  const coreElements = useRef(new Map<string, SVGCircleElement>());
  const glowElements = useRef(new Map<string, SVGCircleElement>());
  const edgeElements = useRef(new Map<string, SVGPathElement>());
  const drag = useRef<GraphDrag>();
  const suppressClick = useRef(false);
  const frame = useRef(0);
  const alpha = useRef(1);
  const currentGraph = useRef<KnowledgeGraphLayout>();
  const fullGraph = useMemo(
    () => buildKnowledgeGraph(features, associations, model, viewport.width / viewport.height),
    [features, associations, model, viewport.width, viewport.height]
  );
  const graph = useMemo(() => {
    if (!simulation) return fullGraph;
    const visibleFeatures = new Set(preview.map((feature) => feature.uuid));
    const ids = new Set(
      fullGraph.nodes
        .filter((node) => node.features.some((feature) => visibleFeatures.has(feature.uuid)))
        .map((node) => node.id)
    );
    for (const edge of fullGraph.edges)
      if (edge.kind === 'context' && ids.has(edge.target)) ids.add(edge.source);
    const replayDependencies = features.some((feature) => feature.type === 'dependency');
    const edges = fullGraph.edges.filter(
      (edge) =>
        ids.has(edge.source) &&
        ids.has(edge.target) &&
        (edge.kind !== 'dependency' ||
          !replayDependencies ||
          edge.features?.some((feature) => visibleFeatures.has(feature.uuid)))
    );
    const degrees = new Map<string, number>();
    for (const edge of edges)
      for (const id of [edge.source, edge.target]) degrees.set(id, (degrees.get(id) ?? 0) + 1);
    return {
      ...fullGraph,
      edges,
      nodes: fullGraph.nodes
        .filter((node) => ids.has(node.id))
        .map((node) => {
          const degree = degrees.get(node.id) ?? 0;
          const arrivingRecords = node.features.filter((feature) =>
            visibleFeatures.has(feature.uuid)
          );
          const records = arrivingRecords.length ? arrivingRecords : node.features;
          return {
            ...node,
            feature: records[0] ?? node.feature,
            features: records,
            degree,
            radius: knowledgeNodeRadius(
              degree,
              node.feature.type === 'entity' && node.category === 'services',
              records.length
            ),
          };
        }),
    };
  }, [fullGraph, preview, simulation, features]);
  currentGraph.current = graph;
  const nodesById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes]
  );
  const activeId =
    hovered ??
    (focusedId
      ? graph.nodes.find((node) => node.features.some((feature) => feature.uuid === focusedId))?.id
      : undefined);
  const activeNode = activeId ? nodesById.get(activeId) : undefined;
  const activeDependency = focusedId
    ? graph.edges.find((edge) => edge.features?.some((feature) => feature.uuid === focusedId))
    : undefined;
  const related = useMemo(
    () =>
      new Set(
        graph.edges
          .filter((edge) => edge.source === activeId || edge.target === activeId)
          .flatMap((edge) => [edge.source, edge.target])
          .concat(activeDependency ? [activeDependency.source, activeDependency.target] : [])
      ),
    [graph.edges, activeId, activeDependency]
  );

  useEffect(() => {
    if (!simulation) return;
    const ordered = [...latestFeatures.current].sort(
      (left, right) =>
        Number(right.type === 'entity') - Number(left.type === 'entity') ||
        (Date.parse(left.updated_at ?? '') || 0) - (Date.parse(right.updated_at ?? '') || 0) ||
        left.uuid.localeCompare(right.uuid)
    );
    particles.current.clear();
    let count = 0;
    let timeout: number;
    let cancelled = false;
    let completed = false;
    let remaining = 650;
    let previousTick = performance.now();
    setPreview([]);
    const tick = (): void => {
      if (cancelled) return;
      const now = performance.now();
      remaining -= (now - previousTick) * speed.current;
      previousTick = now;
      if (remaining <= 0) {
        if (completed || !ordered.length) {
          finishSimulation.current?.();
          return;
        }
        count++;
        setPreview(ordered.slice(0, count));
        completed = count >= ordered.length;
        remaining = completed
          ? 3500
          : 350 + Math.pow(Math.random(), 1.5) * 1400 + (Math.random() < 0.13 ? 1700 : 0);
      }
      timeout = window.setTimeout(tick, 50);
    };
    timeout = window.setTimeout(tick, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [simulation, scopeKey]);

  const paint = useCallback(() => {
    for (const particle of particles.current.values()) {
      coreElements.current.get(particle.node.id)?.setAttribute('r', String(particle.radius));
      const glow = glowElements.current.get(particle.node.id);
      if (glow)
        glow.setAttribute(
          'r',
          String(particle.radius * Number(glow.getAttribute('data-glow-scale') ?? 5))
        );
      nodeElements.current
        .get(particle.node.id)
        ?.setAttribute('transform', `translate(${particle.x}, ${particle.y})`);
    }
    for (const edge of currentGraph.current?.edges ?? []) {
      const source = particles.current.get(edge.source);
      const target = particles.current.get(edge.target);
      if (!source || !target) continue;
      const bend = edge.kind === 'context' ? 0.04 : 0.1;
      edgeElements.current
        .get(edge.id)
        ?.setAttribute(
          'd',
          `M ${source.x} ${source.y} Q ${
            (source.x + target.x) / 2 - (target.y - source.y) * bend
          } ${(source.y + target.y) / 2 + (target.x - source.x) * bend} ${target.x} ${target.y}`
        );
    }
  }, []);
  const wake = useCallback(() => {
    window.cancelAnimationFrame(frame.current);
    alpha.current = 1;
    let ticks = 0;
    const animate = () => {
      const layout = currentGraph.current;
      if (!layout) return;
      const energy = stepKnowledgeGravity(particles.current, layout, alpha.current);
      paint();
      ticks++;
      alpha.current *= 0.985;
      if (ticks < 300 && (energy > 0.002 || ticks < 90 || drag.current?.nodeId))
        frame.current = window.requestAnimationFrame(animate);
      else if (cameraFocus.current) finalFocusFit.current?.();
    };
    frame.current = window.requestAnimationFrame(animate);
  }, [paint]);
  const gravityScope = useRef<string>();
  useEffect(() => {
    if (gravityScope.current !== scopeKey) {
      for (const node of graph.nodes) {
        const particle = particles.current.get(node.id);
        if (particle) {
          particle.x += node.x - particle.node.x;
          particle.y += node.y - particle.node.y;
        }
      }
      gravityScope.current = scopeKey;
    }
    particles.current = reconcileKnowledgeParticles(
      graph,
      particles.current,
      simulation || learning
    );
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let tick = 0; tick < 150; tick++)
        stepKnowledgeGravity(particles.current, graph, 1 - tick / 160);
      paint();
    } else wake();
    return () => window.cancelAnimationFrame(frame.current);
  }, [graph, scopeKey, simulation, learning, paint, wake]);

  const moveCamera = useCallback((target: Camera): void => {
    window.cancelAnimationFrame(cameraFrame.current);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCamera(target);
      return;
    }
    const initial = cameraValue.current;
    const started = performance.now();
    const animate = (now: number): void => {
      const progress = Math.min(1, (now - started) / 320);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCamera({
        x: initial.x + (target.x - initial.x) * eased,
        y: initial.y + (target.y - initial.y) * eased,
        zoom: initial.zoom + (target.zoom - initial.zoom) * eased,
      });
      if (progress < 1) cameraFrame.current = window.requestAnimationFrame(animate);
    };
    cameraFrame.current = window.requestAnimationFrame(animate);
  }, []);
  const fit = useCallback(
    (settled = false): void => {
      const focus = cameraFocus.current?.scope === scopeKey ? cameraFocus.current : undefined;
      const ids = focus
        ? new Set([
            focus.main,
            focus.clicked,
            ...graph.edges
              .filter((edge) => edge.source === focus.main || edge.target === focus.main)
              .flatMap((edge) => [edge.source, edge.target]),
          ])
        : undefined;
      const positions = focus
        ? graph.nodes
            .filter((node) => ids?.has(node.id))
            .map((node) => particles.current.get(node.id) ?? node)
        : settled && !simulation && particles.current.size
        ? [...particles.current.values()]
        : fullGraph.nodes;
      const minX = positions.length ? Math.min(...positions.map((node) => node.x)) - 72 : 0;
      const maxX = positions.length
        ? Math.max(...positions.map((node) => node.x)) + 72
        : fullGraph.width;
      const minY = positions.length ? Math.min(...positions.map((node) => node.y)) - 56 : 0;
      const maxY = positions.length
        ? Math.max(...positions.map((node) => node.y)) + 64
        : fullGraph.height;
      const zoom = Math.min(
        (viewport.width - 64) / (maxX - minX),
        (viewport.height - 48) / (maxY - minY),
        focus ? 3 : 1.8
      );
      moveCamera({
        x: viewport.width / 2 - ((minX + maxX) / 2) * zoom,
        y: viewport.height / 2 - ((minY + maxY) / 2) * zoom,
        zoom,
      });
    },
    [viewport.width, viewport.height, fullGraph, graph, simulation, scopeKey, moveCamera]
  );
  finalFocusFit.current = () => fit(true);
  const focusKnowledge = useCallback(
    (feature: Feature): void => {
      const node = graph.nodes.find((candidate) =>
        candidate.features.some((record) => record.uuid === feature.uuid)
      );
      const dependency = graph.edges.find((edge) =>
        edge.features?.some((record) => record.uuid === feature.uuid)
      );
      const main = node?.entity
        ? node.id
        : node
        ? graph.edges.find((edge) => edge.kind === 'context' && edge.target === node.id)?.source ??
          node.id
        : dependency?.source;
      const clicked = node?.id ?? dependency?.target;
      if (!main || !clicked) return;
      cameraFocus.current = { scope: scopeKey, main, clicked };
      lastSelected.current = feature.uuid;
      fit(true);
    },
    [graph, scopeKey, fit]
  );
  const inspectKnowledge = (feature: Feature): void => {
    focusKnowledge(feature);
    onInspectFeature(feature);
  };
  useEffect(() => {
    if (!selectedId) {
      lastSelected.current = undefined;
      return;
    }
    if (lastSelected.current === selectedId) return;
    const feature =
      graph.nodes.flatMap((node) => node.features).find((record) => record.uuid === selectedId) ??
      graph.edges
        .flatMap((edge) => edge.features ?? [])
        .find((record) => record.uuid === selectedId);
    if (feature) focusKnowledge(feature);
  }, [selectedId, graph, focusKnowledge]);
  const lastScope = useRef<string>();
  useEffect(() => {
    const key = `${scopeKey}:${viewport.width}`;
    if (lastScope.current === key) return;
    lastScope.current = key;
    if (cameraFocus.current?.scope !== scopeKey) cameraFocus.current = undefined;
    fit();
  }, [scopeKey, viewport.width, fit]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => {
      const width = svg.clientWidth;
      if (width > 0) setViewport((value) => (value.width === width ? value : { ...value, width }));
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const previous = useRef<Map<string, string>>();
  const previousScope = useRef<string>();
  useEffect(() => {
    const versions = new Map(
      graph.nodes.map((node) => [
        node.id,
        node.features.map((feature) => `${feature.uuid}:${feature.updated_at ?? ''}`).join('|'),
      ])
    );
    setFresh(
      new Set(
        graph.nodes
          .filter(
            (node) =>
              previousScope.current === scopeKey &&
              previous.current &&
              previous.current.get(node.id) !==
                node.features
                  .map((feature) => `${feature.uuid}:${feature.updated_at ?? ''}`)
                  .join('|')
          )
          .map((node) => node.id)
      )
    );
    previous.current = versions;
    previousScope.current = scopeKey;
    const timeout = window.setTimeout(() => setFresh(new Set()), 5000);
    return () => window.clearTimeout(timeout);
  }, [graph.nodes, scopeKey]);
  const zoomAt = useCallback(
    (factor: number, x: number, y: number) => {
      cancelCameraFocus();
      setCamera((value) => {
        const zoom = Math.max(0.2, Math.min(5, value.zoom * factor));
        return {
          zoom,
          x: x - ((x - value.x) * zoom) / value.zoom,
          y: y - ((y - value.y) * zoom) / value.zoom,
        };
      });
    },
    [cancelCameraFocus]
  );
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = svg.getBoundingClientRect();
      zoomAt(
        Math.exp(-Math.max(-90, Math.min(90, event.deltaY)) * 0.006),
        event.clientX - bounds.left,
        event.clientY - bounds.top
      );
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [zoomAt]);
  const colors = {
    services: euiTheme.colors.vis.euiColorVis1,
    technologies: euiTheme.colors.vis.euiColorVis4,
    dependencies: euiTheme.colors.vis.euiColorVis2,
    infrastructure: euiTheme.colors.vis.euiColorVis7,
    patterns: euiTheme.colors.primary,
    all: euiTheme.colors.primary,
  };
  const labels = {
    services: journey.services,
    technologies: journey.technologies,
    dependencies: journey.dependencies,
    infrastructure: journey.infrastructure,
    patterns: journey.patterns,
  };
  const startDrag = (event: React.PointerEvent<SVGElement>, nodeId?: string): void => {
    if (event.button !== 0) return;
    event.stopPropagation();
    cancelCameraFocus();
    const svg = svgRef.current;
    if (!svg) return;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      camera,
      nodeId,
      moved: false,
    };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
    if (nodeId) {
      const particle = particles.current.get(nodeId);
      if (particle) particle.pinned = true;
    }
  };
  const releaseDrag = (): void => {
    const state = drag.current;
    if (state?.nodeId) {
      const particle = particles.current.get(state.nodeId);
      if (particle) particle.pinned = false;
      wake();
    }
    suppressClick.current = state?.moved ?? false;
    drag.current = undefined;
    setPanning(false);
  };
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      data-test-subj="knowledgeGraph"
      css={css`
        overflow: hidden;
        background: ${euiTheme.colors.backgroundBasePlain};
      `}
    >
      <div
        css={css`
          padding: ${euiTheme.size.m} ${euiTheme.size.l};
          border-bottom: ${euiTheme.border.thin};
        `}
      >
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{text.graphTitle}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color={simulation || learning ? 'primary' : 'hollow'}
                  iconType={simulation || learning ? 'sparkles' : 'check'}
                >
                  {simulation ? text.preview : learning ? text.learning : text.live}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {simulation ? preview.length : features.length}
                  {simulation ? ` / ${features.length}` : ''} {text.knowledge.toLowerCase()} ·{' '}
                  {graph.nodes.length} {text.nodes.toLowerCase()} · {graph.edges.length}{' '}
                  {text.connections.toLowerCase()}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div
        css={css`
          position: relative;
          height: 480px;
        `}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="480"
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          role="group"
          aria-label={text.graphAccessible}
          tabIndex={0}
          css={css`
            display: block;
            touch-action: none;
            cursor: ${panning ? 'grabbing' : 'grab'};
          `}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) startDrag(event);
          }}
          onPointerMove={(event) => {
            const state = drag.current;
            if (!state || state.pointerId !== event.pointerId) return;
            const dx = event.clientX - state.x;
            const dy = event.clientY - state.y;
            if (Math.abs(dx) + Math.abs(dy) > 4) state.moved = true;
            if (state.nodeId) {
              const particle = particles.current.get(state.nodeId);
              const bounds = event.currentTarget.getBoundingClientRect();
              if (particle) {
                particle.x = (event.clientX - bounds.left - camera.x) / camera.zoom;
                particle.y = (event.clientY - bounds.top - camera.y) / camera.zoom;
                particle.vx = 0;
                particle.vy = 0;
                paint();
                wake();
              }
            } else setCamera({ ...state.camera, x: state.camera.x + dx, y: state.camera.y + dy });
          }}
          onPointerUp={releaseDrag}
          onPointerCancel={releaseDrag}
          onLostPointerCapture={() => {
            if (drag.current) releaseDrag();
          }}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === '+' || event.key === '=')
              zoomAt(1.2, viewport.width / 2, viewport.height / 2);
            else if (event.key === '-') zoomAt(0.8, viewport.width / 2, viewport.height / 2);
            else if (event.key.startsWith('Arrow')) {
              event.preventDefault();
              cancelCameraFocus();
              setCamera((value) => ({
                ...value,
                x:
                  value.x + (event.key === 'ArrowLeft' ? 30 : event.key === 'ArrowRight' ? -30 : 0),
                y: value.y + (event.key === 'ArrowUp' ? 30 : event.key === 'ArrowDown' ? -30 : 0),
              }));
            }
          }}
        >
          <defs>
            {Object.entries(colors).map(([category, color]) => (
              <React.Fragment key={category}>
                <radialGradient id={`${gradientId}-${category}`}>
                  <stop offset="0" stopColor={euiTheme.colors.text} stopOpacity="1" />
                  <stop offset=".3" stopColor={color} stopOpacity="1" />
                  <stop offset="1" stopColor={color} stopOpacity=".65" />
                </radialGradient>
                <radialGradient id={`${gradientId}-halo-${category}`}>
                  <stop offset="0" stopColor={color} stopOpacity=".3" />
                  <stop offset=".3" stopColor={color} stopOpacity=".1" />
                  <stop offset="1" stopColor={color} stopOpacity="0" />
                </radialGradient>
              </React.Fragment>
            ))}
          </defs>
          <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.zoom})`}>
            {graph.edges.map((edge, edgeIndex) => {
              const source = nodesById.get(edge.source);
              const target = nodesById.get(edge.target);
              if (!source || !target) return null;
              const selected =
                edge.source === activeId ||
                edge.target === activeId ||
                edge.id === activeDependency?.id;
              return (
                <path
                  key={edge.id}
                  id={`${gradientId}-link-${edgeIndex}`}
                  ref={(element) => {
                    if (element) edgeElements.current.set(edge.id, element);
                    else edgeElements.current.delete(edge.id);
                  }}
                  d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                  fill="none"
                  stroke={edge.kind === 'dependency' ? colors.dependencies : colors.technologies}
                  strokeWidth={selected ? 2 : edge.kind === 'context' ? 0.9 : 1.5}
                  strokeOpacity={
                    selected ? 1 : activeId ? 0.18 : edge.kind === 'context' ? 0.42 : 0.75
                  }
                  strokeDasharray={edge.kind === 'context' ? '2 4' : undefined}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents={edge.kind === 'dependency' ? 'stroke' : 'none'}
                  role={edge.kind === 'dependency' ? 'button' : undefined}
                  tabIndex={edge.kind === 'dependency' ? 0 : undefined}
                  aria-label={edge.features
                    ?.map((feature) => feature.title ?? feature.id)
                    .join(' · ')}
                  onClick={() => {
                    if (edge.features?.[0]) inspectKnowledge(edge.features[0]);
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && edge.features?.[0]) {
                      event.preventDefault();
                      inspectKnowledge(edge.features[0]);
                    }
                  }}
                  css={css`
                    cursor: ${edge.kind === 'dependency' ? 'pointer' : 'default'};
                  `}
                >
                  {edge.kind === 'dependency' && (
                    <title>
                      {edge.features
                        ?.map((feature) => `${feature.title ?? feature.id}: ${feature.description}`)
                        .join(' · ')}
                    </title>
                  )}
                </path>
              );
            })}
            <g
              pointerEvents="none"
              aria-hidden={true}
              data-test-subj="knowledgeDependencyLights"
              css={css`
                @media (prefers-reduced-motion: reduce) {
                  display: none;
                }
              `}
            >
              {graph.edges.map(
                (edge, edgeIndex) =>
                  edge.kind === 'dependency' &&
                  [0, 1].map((pulse) => {
                    const connected =
                      !activeId || edge.source === activeId || edge.target === activeId;
                    const duration = 3.8 + (edgeIndex % 5) * 0.35;
                    return (
                      <g key={`${edge.id}:${pulse}`} opacity={connected ? 0.85 : 0.1}>
                        <circle r="7" fill={`url(#${gradientId}-halo-dependencies)`} />
                        <circle r="2.2" fill={colors.dependencies} />
                        <circle r="1" fill={euiTheme.colors.text} />
                        <animateMotion
                          dur={`${duration}s`}
                          begin={`${-duration * (pulse / 2 + (edgeIndex % 7) / 7)}s`}
                          repeatCount="indefinite"
                          calcMode="linear"
                          rotate="auto"
                        >
                          <mpath href={`#${gradientId}-link-${edgeIndex}`} />
                        </animateMotion>
                      </g>
                    );
                  })
              )}
            </g>
            {graph.nodes.map((node) => {
              const active = node.id === activeId;
              const color = colors[node.category];
              const radius = particles.current.get(node.id)?.radius ?? node.radius;
              const important = node.anchor || node.degree > 7;
              const showLabel =
                active || (important && (!activeId || related.has(node.id))) || camera.zoom > 1.5;
              const label = node.label.length > 26 ? `${node.label.slice(0, 25)}…` : node.label;
              return (
                <g
                  key={node.id}
                  ref={(element) => {
                    if (element) nodeElements.current.set(node.id, element);
                    else nodeElements.current.delete(node.id);
                  }}
                  transform={`translate(${particles.current.get(node.id)?.x ?? node.x}, ${
                    particles.current.get(node.id)?.y ?? node.y
                  })`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label} · ${node.stream} · ${node.degree} ${text.connections}`}
                  data-test-subj="knowledgeGraphFeature"
                  onMouseEnter={() => highlight(node.id)}
                  onMouseLeave={clearHover}
                  onFocus={() => highlight(node.id)}
                  onBlur={clearHover}
                  onPointerDown={(event) => startDrag(event, node.id)}
                  onClick={() => {
                    if (!suppressClick.current) inspectKnowledge(node.feature);
                    suppressClick.current = false;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      inspectKnowledge(node.feature);
                    }
                  }}
                  css={css`
                    cursor: ${panning ? 'grabbing' : 'pointer'};
                    outline: none;
                    opacity: ${activeId && !active && !related.has(node.id) ? 0.23 : 1};
                    transition: opacity 0.25s;
                    animation: ${birth} 0.7s ease-out;
                    @media (prefers-reduced-motion: reduce) {
                      animation: none;
                      transition: none;
                    }
                  `}
                >
                  <title>{`${node.label} · ${node.stream}`}</title>
                  <circle
                    ref={(element) => {
                      if (element) glowElements.current.set(node.id, element);
                      else glowElements.current.delete(node.id);
                    }}
                    data-glow-scale={active ? 6 : 5}
                    r={radius * (active ? 6 : 5)}
                    fill={`url(#${gradientId}-halo-${node.category})`}
                    pointerEvents="none"
                  />
                  {(fresh.has(node.id) || (learning && active)) && (
                    <circle
                      r={node.radius + 5}
                      fill="none"
                      stroke={color}
                      css={css`
                        transform-box: fill-box;
                        transform-origin: center;
                        animation: ${ripple} 1.8s ease-out 3;
                        @media (prefers-reduced-motion: reduce) {
                          animation: none;
                        }
                      `}
                    />
                  )}
                  {node.category === 'infrastructure' ? (
                    <rect
                      x={-node.radius * 0.8}
                      y={-node.radius * 0.8}
                      width={node.radius * 1.6}
                      height={node.radius * 1.6}
                      rx={node.radius * 0.3}
                      fill={`url(#${gradientId}-${node.category})`}
                      stroke={active ? euiTheme.colors.text : color}
                      strokeWidth={active ? 2 : 0.7}
                    />
                  ) : (
                    <circle
                      ref={(element) => {
                        if (element) coreElements.current.set(node.id, element);
                        else coreElements.current.delete(node.id);
                      }}
                      r={radius}
                      fill={`url(#${gradientId}-${node.category})`}
                      fillOpacity={node.feature.excluded ? 0.3 : 0.95}
                      stroke={active ? euiTheme.colors.text : color}
                      strokeWidth={active ? 2 : 0.6}
                    />
                  )}
                  {important && (
                    <path
                      d={`M ${-node.radius * 2.6} 0 H ${node.radius * 2.6} M 0 ${
                        -node.radius * 2.6
                      } V ${node.radius * 2.6}`}
                      stroke={color}
                      strokeOpacity=".35"
                      strokeWidth=".6"
                      pointerEvents="none"
                    />
                  )}
                  <circle r={Math.max(14, node.radius + 5)} fill="transparent" />
                  {showLabel && (
                    <g pointerEvents="none">
                      <rect
                        x={-(label.length * 3 + 5) / camera.zoom}
                        y={node.radius + 9}
                        width={(label.length * 6 + 10) / camera.zoom}
                        height={17 / camera.zoom}
                        rx={4 / camera.zoom}
                        fill={euiTheme.colors.backgroundBasePlain}
                        fillOpacity=".82"
                      />
                      <text
                        y={node.radius + 9 + 12 / camera.zoom}
                        textAnchor="middle"
                        fill={active ? color : euiTheme.colors.text}
                        fontSize={10 / camera.zoom}
                        fontWeight={important ? 600 : 400}
                      >
                        {label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        {!features.length && (
          <div
            css={css`
              position: absolute;
              inset: 0;
              display: grid;
              place-items: center;
              pointer-events: none;
            `}
          >
            <EuiEmptyPrompt
              iconType="graphApp"
              titleSize="s"
              title={<h3>{text.blankTitle}</h3>}
              body={<p>{text.blankBody}</p>}
            />
          </div>
        )}
        {activeNode && (
          <div
            onMouseEnter={() => window.clearTimeout(hoverTimer.current)}
            onMouseLeave={clearHover}
            onFocus={() => window.clearTimeout(hoverTimer.current)}
            onBlur={clearHover}
            css={css`
              position: absolute;
              top: 12px;
              right: 16px;
              max-width: 270px;
              padding: ${euiTheme.size.m};
              border: ${euiTheme.border.thin};
              border-radius: ${euiTheme.border.radius.medium};
              background: ${euiTheme.colors.backgroundBasePlain};
              box-shadow: 0 4px 24px
                color-mix(in srgb, ${colors[activeNode.category]} 15%, transparent);
            `}
          >
            <EuiText size="xs">
              <strong>{activeNode.label}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              <p>{activeNode.feature.description.slice(0, 140)}</p>
            </EuiText>
            <EuiText size="xs">
              {activeNode.feature.confidence}% · {activeNode.degree}{' '}
              {text.connections.toLowerCase()}
            </EuiText>
            {activeNode.features.length > 1 && (
              <>
                <EuiText size="xs" color="subdued">
                  <p>
                    {activeNode.features.length} {text.groupedRecords.toLowerCase()}
                  </p>
                </EuiText>
                <EuiSelect
                  compressed
                  fullWidth
                  aria-label={text.inspectSourceRecord}
                  value=""
                  options={[
                    { value: '', text: text.inspectSourceRecord },
                    ...activeNode.features.map((feature) => ({
                      value: feature.uuid,
                      text: `${feature.stream_name} · ${feature.confidence}%`,
                    })),
                  ]}
                  data-test-subj="knowledgeGalaxyGroupedRecords"
                  onChange={(event) => {
                    const feature = activeNode.features.find(
                      (record) => record.uuid === event.target.value
                    );
                    if (feature) inspectKnowledge(feature);
                  }}
                />
              </>
            )}
            {activeNode.entity && (
              <EuiButtonEmpty
                size="xs"
                iconType="filter"
                data-test-subj="knowledgeGraphFocusService"
                onClick={() => onSelectService(activeNode.entity?.id ?? '')}
              >
                {text.focusService}
              </EuiButtonEmpty>
            )}
          </div>
        )}
        <div
          css={css`
            position: absolute;
            right: 12px;
            bottom: 12px;
            display: flex;
            gap: 4px;
            padding: 4px;
            background: ${euiTheme.colors.backgroundBasePlain};
            border: ${euiTheme.border.thin};
            border-radius: ${euiTheme.border.radius.medium};
          `}
        >
          <EuiToolTip content={text.zoomIn} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="plus"
              aria-label={text.zoomIn}
              data-test-subj="knowledgeGalaxyZoomIn"
              onClick={() => zoomAt(1.25, viewport.width / 2, viewport.height / 2)}
            />
          </EuiToolTip>
          <EuiToolTip content={text.zoomOut} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="minus"
              aria-label={text.zoomOut}
              data-test-subj="knowledgeGalaxyZoomOut"
              onClick={() => zoomAt(0.8, viewport.width / 2, viewport.height / 2)}
            />
          </EuiToolTip>
          <EuiToolTip content={text.fit} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="fullScreen"
              aria-label={text.fit}
              data-test-subj="knowledgeGalaxyFit"
              onClick={() => {
                cancelCameraFocus();
                fit(true);
              }}
            />
          </EuiToolTip>
        </div>
      </div>
      <div
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.l};
          border-top: ${euiTheme.border.thin};
        `}
      >
        <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
          {Object.entries(labels).map(([category, label]) => (
            <EuiFlexItem key={category} grow={false}>
              <EuiText size="xs" color="subdued">
                <span style={{ color: colors[category as keyof typeof colors] }}>●</span> {label}
              </EuiText>
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {text.sizeHint}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            margin-top: 6px;
          `}
        >
          {simulation ? text.previewHint : text.graphHint}
        </EuiText>
      </div>
    </EuiPanel>
  );
};
