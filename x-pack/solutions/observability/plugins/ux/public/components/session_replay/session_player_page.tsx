/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiCode,
  EuiCopy,
  EuiEmptyPrompt,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import { css } from '@emotion/react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { UxTourAnchor } from '../app/rum_tour/ux_tour_anchor';
import { useSyncOpenWithTourStep } from '../app/rum_tour/use_sync_open_with_tour_step';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchAllSessionReplayEvents } from '../../services/rest/session_replay_api';
import {
  uxAppHref,
  mergeRumSearch,
  parseReplayOffsetMs,
  pushRumPath,
} from '../../utils/rum_search';
import { serviceNameFromPath, uxSessionIdFromPath } from '../../utils/ux_app_path';
import { skipIdleSeekMs } from '../../../common/session_replay_skip_idle';
import { rrwebCanvasReplay } from '../../session_replay/rrweb_canvas_replay';

interface ReplayerMirror {
  getId: (node: Node) => number;
  getNode: (id: number) => Node | null;
}

interface ReplayerInstance {
  play: (timeOffset?: number) => void;
  pause: (timeOffset?: number) => void;
  setConfig: (config: { speed?: number; skipInactive?: boolean }) => void;
  getCurrentTime: () => number;
  getMetaData: () => { startTime: number; endTime: number; totalTime: number };
  getMirror?: () => ReplayerMirror;
  on: (event: string, handler: (...args: unknown[]) => void) => ReplayerInstance;
  off?: (event: string, handler: (...args: unknown[]) => void) => ReplayerInstance;
  destroy: () => void;
}

interface InspectedNode {
  rrwebId: number;
  tag: string;
  idAttr: string | null;
  classes: string[];
  selector: string;
  path: string;
  attrs: Array<[string, string]>;
  text: string;
  width: number;
  height: number;
}

interface ReplayEventLike {
  type?: number;
  timestamp?: number;
  data?: {
    href?: string;
    width?: number;
    height?: number;
    source?: number;
    type?: number;
  };
}

interface TimelineMarker {
  pct: number;
  kind: 'click' | 'page';
  label: string;
}

const formatClock = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) {
    return '0:00';
  }
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** Prefer pathname over raw capture URLs (query strings are noisy in the chrome). */
const formatPageLabel = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.pathname || '/';
  } catch {
    return url.length > 64 ? `${url.slice(0, 61)}…` : url;
  }
};

const MIN_STAGE_HEIGHT = 200;
const PAGE_BOTTOM_GAP = 8;
const INSPECT_OVERLAY_ID = '__uxInspectOverlay__';

const cssEscape = (value: string): string =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);

const shortSelector = (el: Element): string => {
  const id = el.getAttribute('id');
  if (id) {
    return `#${cssEscape(id)}`;
  }
  const classes = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
  const tag = el.tagName.toLowerCase();
  return classes.length ? `${tag}.${classes.map(cssEscape).join('.')}` : tag;
};

/** Build a short ancestor path (stops at the nearest id) for context. */
const buildSelectorPath = (el: Element): string => {
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;
  while (node && node.nodeType === 1 && depth < 4) {
    parts.unshift(shortSelector(node));
    if (node.getAttribute('id')) {
      break;
    }
    node = node.parentElement;
    depth += 1;
  }
  return parts.join(' › ');
};

const describeNode = (target: Element, mirror: ReplayerMirror | undefined): InspectedNode => {
  const rect = target.getBoundingClientRect();
  const idAttr = target.getAttribute('id');
  const classes = (target.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
  return {
    rrwebId: mirror?.getId(target) ?? -1,
    tag: target.tagName.toLowerCase(),
    idAttr: idAttr || null,
    classes,
    selector: shortSelector(target),
    path: buildSelectorPath(target),
    attrs: Array.from(target.attributes).map((attr) => [attr.name, attr.value] as [string, string]),
    text: (target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
};

const buildMarkers = (events: ReplayEventLike[], totalTime: number): TimelineMarker[] => {
  if (totalTime <= 0 || events.length === 0) {
    return [];
  }
  const start = events[0]?.timestamp ?? 0;
  const markers: TimelineMarker[] = [];
  for (const event of events) {
    if (typeof event.timestamp !== 'number') {
      continue;
    }
    const pct = Math.min(100, Math.max(0, ((event.timestamp - start) / totalTime) * 100));
    // EventType.Meta = 4
    if (event.type === 4 && event.data?.href) {
      markers.push({ pct, kind: 'page', label: event.data.href });
    }
    // IncrementalSnapshot + MouseInteraction + Click
    if (event.type === 3 && event.data?.source === 2 && event.data?.type === 2) {
      markers.push({ pct, kind: 'click', label: 'Click' });
    }
  }
  // Cap density so the scrubber stays readable.
  if (markers.length <= 40) {
    return markers;
  }
  const step = Math.ceil(markers.length / 40);
  return markers.filter((_, index) => index % step === 0);
};

const InspectorPanel = ({ node }: { node: InspectedNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.ux.sessionReplay.player.inspector.selector', {
          defaultMessage: 'Selector',
        })}
      </EuiText>
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
          margin-top: ${euiTheme.size.xs};
        `}
      >
        <EuiCode
          css={css`
            flex: 1 1 auto;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {node.selector}
        </EuiCode>
        <EuiCopy textToCopy={node.selector}>
          {(copy) => (
            <EuiToolTip
              content={i18n.translate('xpack.ux.sessionReplay.player.inspector.copySelector', {
                defaultMessage: 'Copy selector',
              })}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                data-test-subj="uxInspectorPanelButton"
                iconType="copy"
                size="xs"
                onClick={copy}
                aria-label={i18n.translate('xpack.ux.sessionReplay.player.inspector.copySelector', {
                  defaultMessage: 'Copy selector',
                })}
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      </div>

      <EuiText
        size="xs"
        color="subdued"
        css={css`
          margin-top: ${euiTheme.size.m};
        `}
      >
        {i18n.translate('xpack.ux.sessionReplay.player.inspector.path', { defaultMessage: 'Path' })}
      </EuiText>
      <EuiText
        size="xs"
        css={css`
          font-family: ${euiTheme.font.familyCode};
          margin-top: ${euiTheme.size.xs};
          word-break: break-word;
        `}
      >
        {node.path}
      </EuiText>

      <div
        css={css`
          display: flex;
          flex-wrap: wrap;
          gap: ${euiTheme.size.xs};
          margin-top: ${euiTheme.size.m};
        `}
      >
        <EuiBadge color="hollow">{`<${node.tag}>`}</EuiBadge>
        <EuiBadge color="default">{`${node.width} × ${node.height}`}</EuiBadge>
        {node.rrwebId >= 0 && <EuiBadge color="hollow">{`rrweb #${node.rrwebId}`}</EuiBadge>}
      </div>

      <EuiText
        size="xs"
        color="subdued"
        css={css`
          margin-top: ${euiTheme.size.m};
        `}
      >
        {i18n.translate('xpack.ux.sessionReplay.player.inspector.attributes', {
          defaultMessage: 'Attributes ({count})',
          values: { count: node.attrs.length },
        })}
      </EuiText>
      {node.attrs.length > 0 && (
        <div
          css={css`
            display: grid;
            grid-template-columns: minmax(0, auto) minmax(0, 1fr);
            gap: 2px ${euiTheme.size.s};
            font-family: ${euiTheme.font.familyCode};
            font-size: 12px;
            margin-top: ${euiTheme.size.xs};
          `}
        >
          {node.attrs.map(([name, value]) => (
            <React.Fragment key={name}>
              <span
                css={css`
                  color: ${euiTheme.colors.accentText};
                `}
              >
                {name}
              </span>
              <span
                css={css`
                  color: ${euiTheme.colors.textSubdued};
                  word-break: break-all;
                `}
                title={value}
              >
                {value || '""'}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {node.text && (
        <>
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              margin-top: ${euiTheme.size.m};
            `}
          >
            {i18n.translate('xpack.ux.sessionReplay.player.inspector.text', {
              defaultMessage: 'Text',
            })}
          </EuiText>
          <EuiText
            size="xs"
            css={css`
              margin-top: ${euiTheme.size.xs};
              word-break: break-word;
            `}
          >
            {node.text}
          </EuiText>
        </>
      )}
    </div>
  );
};

export function SessionPlayerPage() {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const location = useLocation();
  const sessionId = uxSessionIdFromPath(location.pathname) ?? '';
  const serviceName = serviceNameFromPath(location.pathname);
  const { http, observabilityShared } = useKibanaServices();
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const replayerRef = useRef<ReplayerInstance | null>(null);
  const eventsRef = useRef<ReplayEventLike[]>([]);
  const playingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState('1');
  const [skipIdle, setSkipIdle] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [ready, setReady] = useState(false);
  const [shellHeight, setShellHeight] = useState<number | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspected, setInspected] = useState<InspectedNode | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const skipIdleRef = useRef(skipIdle);
  skipIdleRef.current = skipIdle;
  const finishedRef = useRef(false);
  const lastSeekMsRef = useRef<number | null>(null);
  const lastTWriteRef = useRef(0);
  playingRef.current = playing;

  const styles = useMemo(
    () => ({
      shell: css`
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid ${euiTheme.colors.borderBaseSubdued};
        border-radius: ${euiTheme.border.radius.medium};
        background: ${euiTheme.colors.backgroundBasePlain};
      `,
      stageRow: css`
        position: relative;
        flex: 1 1 auto;
        display: flex;
        min-height: 0;
      `,
      inspector: css`
        flex: 0 0 320px;
        min-width: 0;
        overflow-y: auto;
        padding: ${euiTheme.size.m};
        background: ${euiTheme.colors.backgroundBasePlain};
        border-left: 1px solid ${euiTheme.colors.borderBaseSubdued};
      `,
      stageWrap: css`
        position: relative;
        z-index: 0;
        flex: 1 1 auto;
        width: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        background: #0b0f14;
        isolation: isolate;

        /* rrweb mounts an absolutely positioned wrapper + full-page iframe */
        .replayer-wrapper {
          position: absolute !important;
          top: 0;
          left: 0;
          transform-origin: top left;
        }

        iframe {
          border: 0;
          background: #fff;
        }
      `,
      /* Dedicated rrweb mount node — React must never render children here, or its
         reconciler collides with rrweb's DOM mutations (removeChild NotFoundError). */
      mount: css`
        position: absolute;
        inset: 0;
      `,
      stageInspecting: css`
        cursor: crosshair;
      `,
      /* Transparent layer over the rrweb iframe so clicking the stage toggles
         play/pause (the iframe otherwise swallows the click). Hidden while
         inspecting, where clicks select elements instead. */
      clickCatcher: css`
        position: absolute;
        inset: 0;
        z-index: 4;
        cursor: pointer;
      `,
      pausedGlyph: css`
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      `,
      pausedGlyphInner: css`
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        color: #fff;
        background: rgba(11, 15, 20, 0.55);
        backdrop-filter: blur(2px);
      `,
      stageOverlay: css`
        position: absolute;
        inset: 0;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(11, 15, 20, 0.72);
      `,
      controls: css`
        position: relative;
        z-index: 2;
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        background: ${euiTheme.colors.backgroundBasePlain};
        border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
      `,
      timeline: css`
        position: relative;
        height: 8px;
        margin: 2px 0;
        border-radius: 999px;
        background: ${euiTheme.colors.lightShade};
        cursor: pointer;
      `,
      played: css`
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        border-radius: 999px;
        background: ${euiTheme.colors.primary};
        pointer-events: none;
      `,
      cursor: css`
        position: absolute;
        top: 50%;
        width: 12px;
        height: 12px;
        margin-left: -6px;
        margin-top: -6px;
        border-radius: 50%;
        background: ${euiTheme.colors.primary};
        box-shadow: 0 0 0 2px ${euiTheme.colors.backgroundBasePlain};
        pointer-events: none;
        z-index: 3;
      `,
      marker: css`
        position: absolute;
        top: 50%;
        width: 4px;
        height: 4px;
        margin-left: -2px;
        margin-top: -2px;
        border-radius: 50%;
        z-index: 2;
        pointer-events: none;
        opacity: 0.85;
      `,
      metaRow: css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.m};
        flex-wrap: nowrap;
        min-height: 32px;
      `,
      metaSpacer: css`
        flex: 1 1 auto;
        min-width: 8px;
      `,
      clock: css`
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        white-space: nowrap;
      `,
      headerMeta: css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        flex-wrap: wrap;
        color: ${euiTheme.colors.textSubdued};
        font-size: ${euiTheme.size.m};
      `,
      headerSessionId: css`
        font-family: ${euiTheme.font.familyCode};
        font-size: 12px;
      `,
      headerSep: css`
        opacity: 0.45;
      `,
      headerPageUrl: css`
        max-width: min(520px, 50vw);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `,
    }),
    [euiTheme]
  );

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.ux.sessionReplay.breadcrumbs.root', {
        defaultMessage: 'User Experience',
      }),
      href: uxAppHref(http.basePath.prepend, { search: location.search }),
    },
    {
      text: i18n.translate('xpack.ux.sessionReplay.breadcrumbs.list', {
        defaultMessage: 'Sessions',
      }),
      href: uxAppHref(http.basePath.prepend, {
        serviceName,
        suffix: '/session-replay',
        search: location.search,
      }),
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        pushRumPath(history, '/session-replay');
      },
    },
    {
      text: sessionId ? sessionId.slice(0, 8) : '—',
      href: uxAppHref(http.basePath.prepend, {
        serviceName,
        suffix: `/session-replay/${encodeURIComponent(sessionId)}`,
        search: location.search,
      }),
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        pushRumPath(history, `/session-replay/${encodeURIComponent(sessionId)}`);
      },
    },
    {
      text: i18n.translate('xpack.ux.sessionReplay.breadcrumbs.replay', {
        defaultMessage: 'Replay',
      }),
    },
  ]);

  useLayoutEffect(() => {
    const measure = () => {
      const node = shellRef.current;
      if (!node) {
        return;
      }
      const top = node.getBoundingClientRect().top;
      const next = Math.floor(window.innerHeight - top - PAGE_BOTTOM_GAP);
      setShellHeight(Math.max(MIN_STAGE_HEIGHT + 72, next));
    };

    measure();
    window.addEventListener('resize', measure);
    // Header description height can change once pageUrl arrives.
    const frame = window.requestAnimationFrame(measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.cancelAnimationFrame(frame);
    };
  }, [pageUrl, error, loading]);

  const destroyPlayer = useCallback(() => {
    if (replayerRef.current?.destroy) {
      try {
        replayerRef.current.destroy();
      } catch {
        // ignore
      }
    }
    replayerRef.current = null;
    eventsRef.current = [];
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, []);

  const syncProgress = useCallback((replayer: ReplayerInstance) => {
    const current = Math.max(0, replayer.getCurrentTime());
    const total = Math.max(replayer.getMetaData().totalTime || 0, 1);
    setCurrentMs(Math.min(current, total));
    setTotalMs(total);
  }, []);

  const replaceSeekParam = useCallback(
    (offsetMs: number) => {
      const rounded = Math.max(0, Math.round(offsetMs));
      lastSeekMsRef.current = rounded;
      const next = mergeRumSearch(history.location.search, { t: String(rounded) });
      const current = history.location.search.replace(/^\?/, '');
      if (next === current) {
        return;
      }
      history.replace({ ...history.location, search: next });
    },
    [history]
  );

  const fitReplayToStage = useCallback((pageWidth?: number, pageHeight?: number) => {
    const stage = containerRef.current;
    const wrapper = stage?.querySelector('.replayer-wrapper') as HTMLElement | null;
    if (!stage || !wrapper) {
      return;
    }

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    if (stageWidth <= 0 || stageHeight <= 0) {
      return;
    }

    const iframe = wrapper.querySelector('iframe') as HTMLIFrameElement | null;
    const width =
      pageWidth ||
      Number(iframe?.width) ||
      iframe?.offsetWidth ||
      wrapper.offsetWidth ||
      stageWidth;
    const height =
      pageHeight ||
      Number(iframe?.height) ||
      iframe?.offsetHeight ||
      wrapper.offsetHeight ||
      stageHeight;

    if (!width || !height) {
      return;
    }

    const scale = Math.min(stageWidth / width, stageHeight / height, 1);
    const left = Math.max(0, (stageWidth - width * scale) / 2);
    const top = Math.max(0, (stageHeight - height * scale) / 2);
    wrapper.style.transformOrigin = 'top left';
    wrapper.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setTruncated(false);
      setCurrentMs(0);
      setTotalMs(0);
      setPageUrl(null);
      setMarkers([]);
      setReady(false);
      destroyPlayer();

      if (!sessionId) {
        setError(
          i18n.translate('xpack.ux.sessionReplay.player.missingSessionId', {
            defaultMessage: 'Missing session id in the URL.',
          })
        );
        setLoading(false);
        return;
      }

      try {
        const response = await fetchAllSessionReplayEvents({ http, sessionId });
        if (cancelled) {
          return;
        }
        setEventCount(response.events.length);
        setTruncated(response.truncated);

        if (response.events.length === 0) {
          setError(
            i18n.translate('xpack.ux.sessionReplay.player.noEvents', {
              defaultMessage: 'No replay events found for this session.',
            })
          );
          return;
        }

        if (response.events.length < 2) {
          setError(
            i18n.translate('xpack.ux.sessionReplay.player.tooFewEvents', {
              defaultMessage:
                'This session only has {count} replay event(s). rrweb needs at least 2 (usually a full snapshot plus mutations). Capture again or check collector/index mapping for dropped DOM events.',
              values: { count: response.events.length },
            })
          );
          return;
        }

        const [{ Replayer: ReplayerCtor }] = await Promise.all([
          import('rrweb'),
          import('rrweb/dist/style.css'),
        ]);
        if (cancelled || !containerRef.current) {
          return;
        }

        const events = response.events as ReplayEventLike[];
        // rrweb only understands EventType 0–7; Elastic emits a synthetic `99` marker.
        const playableEvents = events.filter(
          (event) => typeof event.type === 'number' && event.type >= 0 && event.type <= 7
        );
        if (playableEvents.length < 2) {
          setError(
            i18n.translate('xpack.ux.sessionReplay.player.tooFewEvents', {
              defaultMessage:
                'This session only has {count} replay event(s). rrweb needs at least 2 (usually a full snapshot plus mutations). Capture again or check collector/index mapping for dropped DOM events.',
              values: { count: playableEvents.length },
            })
          );
          return;
        }

        const firstMeta = playableEvents.find((event) => event.type === 4 && event.data?.href);
        if (firstMeta?.data?.href) {
          setPageUrl(firstMeta.data.href);
        }

        eventsRef.current = playableEvents;
        const replayer = new ReplayerCtor(playableEvents as never[], {
          root: containerRef.current,
          speed: Number(speedRef.current),
          skipInactive: false,
          ...rrwebCanvasReplay,
        }) as unknown as ReplayerInstance;

        const meta = replayer.getMetaData();
        const duration = Math.max(meta.totalTime || 0, 1);
        setTotalMs(duration);
        setCurrentMs(0);
        setMarkers(buildMarkers(playableEvents, duration));

        finishedRef.current = false;
        setPlaying(false);

        replayer.on('finish', () => {
          finishedRef.current = true;
          setPlaying(false);
          setCurrentMs(duration);
        });
        replayer.on('resize', (raw) => {
          const size = raw as { width?: number; height?: number };
          fitReplayToStage(size.width, size.height);
        });
        replayer.on('event-cast', (raw) => {
          syncProgress(replayer);
          const event = raw as ReplayEventLike;
          if (event.type === 4 && event.data?.href) {
            setPageUrl(event.data.href);
          }
          if (event.type === 4 && event.data?.width && event.data?.height) {
            fitReplayToStage(event.data.width, event.data.height);
          }
        });

        // Meta usually arrives before first paint; fit after mount too.
        requestAnimationFrame(() => {
          fitReplayToStage(firstMeta?.data?.width, firstMeta?.data?.height);
        });

        replayerRef.current = replayer;
        setReady(true);

        const initialOffset = parseReplayOffsetMs(history.location.search);
        if (initialOffset != null && initialOffset > 0) {
          const offset = Math.min(initialOffset, duration);
          lastSeekMsRef.current = offset;
          replayer.pause(offset);
          setCurrentMs(offset);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      destroyPlayer();
    };
  }, [http, sessionId, destroyPlayer, syncProgress, fitReplayToStage, history]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const seekMs = parseReplayOffsetMs(location.search);
    if (seekMs == null || lastSeekMsRef.current === seekMs) {
      return;
    }
    const replayer = replayerRef.current;
    if (!replayer) {
      return;
    }
    const total = Math.max(replayer.getMetaData().totalTime || 0, 1);
    const offset = Math.min(seekMs, total);
    lastSeekMsRef.current = offset;
    finishedRef.current = false;
    replayer.pause(offset);
    setCurrentMs(offset);
    setPlaying(false);
  }, [ready, location.search]);

  useEffect(() => {
    if (shellHeight != null) {
      fitReplayToStage();
    }
  }, [shellHeight, fitReplayToStage]);

  const seekPastIdle = useCallback(() => {
    if (!skipIdleRef.current) {
      return;
    }
    const replayer = replayerRef.current;
    if (!replayer) {
      return;
    }
    const next = skipIdleSeekMs(eventsRef.current, replayer.getCurrentTime());
    if (next == null) {
      return;
    }
    if (playingRef.current) {
      replayer.play(next);
    } else {
      replayer.pause(next);
    }
    setCurrentMs(next);
    replaceSeekParam(next);
  }, [replaceSeekParam]);

  useEffect(() => {
    replayerRef.current?.setConfig({ speed: Number(speed) });
  }, [speed]);

  useEffect(() => {
    if (skipIdle) {
      seekPastIdle();
    }
  }, [skipIdle, seekPastIdle]);

  useEffect(() => {
    const stage = containerRef.current;
    if (!stage) {
      return;
    }
    const observer = new ResizeObserver(() => {
      fitReplayToStage();
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [fitReplayToStage, ready]);

  useEffect(() => {
    const onResize = () => fitReplayToStage();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitReplayToStage]);

  const toggleInspect = useCallback(() => {
    setInspecting((prev) => {
      const next = !prev;
      if (next && playingRef.current) {
        replayerRef.current?.pause();
        setPlaying(false);
      }
      if (!next) {
        setInspected(null);
      }
      return next;
    });
  }, []);

  const setInspectingFromTour = useCallback((open: boolean) => {
    setInspecting(open);
    if (open && playingRef.current) {
      replayerRef.current?.pause();
      setPlaying(false);
    }
    if (!open) {
      setInspected(null);
    }
  }, []);
  useSyncOpenWithTourStep('playerInspect', setInspectingFromTour);

  // Hover/click the reconstructed DOM (rrweb iframe) to highlight + describe nodes.
  useEffect(() => {
    if (!inspecting || !ready) {
      return;
    }
    const iframe = containerRef.current?.querySelector(
      '.replayer-wrapper iframe'
    ) as HTMLIFrameElement | null;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) {
      return;
    }
    const mirror = replayerRef.current?.getMirror?.();
    iframe.style.pointerEvents = 'auto';
    doc.body.style.cursor = 'crosshair';

    const ensureOverlay = (): HTMLElement => {
      let node = doc.getElementById(INSPECT_OVERLAY_ID);
      if (!node) {
        node = doc.createElement('div');
        node.id = INSPECT_OVERLAY_ID;
        Object.assign(node.style, {
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: '2147483647',
          border: '2px solid #61A2FF',
          background: 'rgba(97, 162, 255, 0.18)',
          boxSizing: 'border-box',
          display: 'none',
        });
        (doc.documentElement || doc.body).appendChild(node);
      }
      return node;
    };

    const positionOverlay = (target: Element) => {
      const overlay = ensureOverlay();
      const rect = target.getBoundingClientRect();
      overlay.style.display = 'block';
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
    };

    // NOTE: nodes live in the iframe realm, so `instanceof Element` (parent realm) is
    // always false. Duck-type via nodeType instead.
    const isInspectable = (target: EventTarget | null): target is Element => {
      const el = target as Element | null;
      return !!el && el.nodeType === 1 && el.id !== INSPECT_OVERLAY_ID;
    };

    const onMove = (event: Event) => {
      if (isInspectable(event.target)) {
        positionOverlay(event.target);
      }
    };
    const onClick = (event: Event) => {
      if (!isInspectable(event.target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      positionOverlay(event.target);
      setInspected(describeNode(event.target, mirror));
    };

    doc.addEventListener('mousemove', onMove, true);
    doc.addEventListener('click', onClick, true);

    return () => {
      doc.removeEventListener('mousemove', onMove, true);
      doc.removeEventListener('click', onClick, true);
      doc.getElementById(INSPECT_OVERLAY_ID)?.remove();
      try {
        doc.body.style.cursor = '';
      } catch {
        // iframe may be gone
      }
    };
  }, [inspecting, ready, currentMs]);

  const seekToPct = useCallback(
    (pct: number) => {
      const replayer = replayerRef.current;
      if (!replayer || totalMs <= 0) {
        return;
      }
      const clamped = Math.min(100, Math.max(0, pct));
      const offset = Math.round((clamped / 100) * totalMs);
      finishedRef.current = false;
      const wasPlaying = playingRef.current;
      // pause(offset) casts events up to offset then pauses (rrweb API).
      replayer.pause(offset);
      setCurrentMs(offset);
      replaceSeekParam(offset);
      if (wasPlaying) {
        replayer.play(offset);
        setPlaying(true);
      } else {
        setPlaying(false);
      }
    },
    [totalMs, replaceSeekParam]
  );

  const onTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = timelineRef.current;
    if (!node) {
      return;
    }
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    seekToPct(((event.clientX - rect.left) / rect.width) * 100);
  };

  const togglePlay = () => {
    const replayer = replayerRef.current;
    if (!replayer) {
      return;
    }
    if (playingRef.current) {
      replayer.pause();
      setPlaying(false);
      syncProgress(replayer);
      return;
    }

    const offset = finishedRef.current || currentMs >= totalMs - 20 ? 0 : Math.max(0, currentMs);
    finishedRef.current = false;
    if (offset === 0) {
      setCurrentMs(0);
    }
    // Always pass an explicit offset — bare play() defaults to 0 in rrweb.
    replayer.play(offset);
    setPlaying(true);
  };

  const restart = () => {
    const replayer = replayerRef.current;
    if (!replayer) {
      return;
    }
    finishedRef.current = false;
    setCurrentMs(0);
    replayer.pause();
    replayer.play(0);
    setPlaying(true);
  };

  // Keep the scrubber moving even between sparse rrweb event-cast callbacks.
  useEffect(() => {
    if (!playing) {
      return;
    }
    const id = window.setInterval(() => {
      const replayer = replayerRef.current;
      if (!replayer) {
        return;
      }
      syncProgress(replayer);
      seekPastIdle();
      const now = Date.now();
      if (now - lastTWriteRef.current >= 1000) {
        lastTWriteRef.current = now;
        replaceSeekParam(replayer.getCurrentTime());
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, syncProgress, replaceSeekParam, seekPastIdle]);

  const progressPct = totalMs > 0 ? Math.min(100, (currentMs / totalMs) * 100) : 0;
  const controlsDisabled = loading || Boolean(error) || !ready;

  return (
    <div data-test-subj="uxSessionReplayPlayerPage">
      <PageTemplateComponent
        paddingSize="m"
        pageSectionProps={{
          contentProps: {
            css: css`
              display: flex;
              flex-direction: column;
              min-height: 0;
              /* Keep page content from extending past the viewport */
              overflow: hidden;
            `,
          },
        }}
        pageHeader={{
          pageTitle: i18n.translate('xpack.ux.sessionReplay.player.title', {
            defaultMessage: 'Session replay',
          }),
          description: (
            <div css={styles.headerMeta} data-test-subj="uxSessionReplayHeaderMeta">
              <span css={styles.headerSessionId}>{sessionId}</span>
              {pageUrl && (
                <>
                  <span css={styles.headerSep}>·</span>
                  <EuiToolTip content={pageUrl}>
                    <span css={styles.headerPageUrl} tabIndex={0}>
                      {formatPageLabel(pageUrl)}
                    </span>
                  </EuiToolTip>
                </>
              )}
            </div>
          ),
          rightSideItems: [
            <EuiButtonEmpty
              data-test-subj="uxSessionPlayerPageBackToSessionsButton"
              key="back"
              iconType="chevronSingleLeft"
              onClick={() =>
                pushRumPath(history, `/session-replay/${encodeURIComponent(sessionId)}`)
              }
            >
              {i18n.translate('xpack.ux.sessionReplay.player.back', {
                defaultMessage: 'Back to session',
              })}
            </EuiButtonEmpty>,
          ],
        }}
      >
        {truncated && !error && (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              color="warning"
              title={i18n.translate('xpack.ux.sessionReplay.player.truncatedTitle', {
                defaultMessage: 'Replay truncated',
              })}
              data-test-subj="uxSessionReplayTruncatedCallout"
            >
              {i18n.translate('xpack.ux.sessionReplay.player.truncatedBody', {
                defaultMessage:
                  'Only the first {count} events were loaded. Later activity in this session is not shown.',
                values: { count: eventCount },
              })}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {error && !loading && (
          <EuiEmptyPrompt
            color="danger"
            iconType="error"
            title={
              <h2>
                {i18n.translate('xpack.ux.sessionReplay.player.errorTitle', {
                  defaultMessage: 'Unable to load replay',
                })}
              </h2>
            }
            body={<p>{error}</p>}
          />
        )}

        {!error && (
          <EuiPanel
            paddingSize="none"
            hasShadow={false}
            hasBorder={false}
            css={styles.shell}
            panelRef={shellRef}
            style={shellHeight != null ? { height: shellHeight } : undefined}
          >
            <div css={styles.stageRow}>
              <div css={[styles.stageWrap, inspecting && styles.stageInspecting]}>
                <div
                  ref={containerRef}
                  css={styles.mount}
                  data-test-subj="uxSessionReplayPlayerFrame"
                />
                {loading && (
                  <div css={styles.stageOverlay}>
                    <EuiLoadingSpinner size="xl" />
                  </div>
                )}
                {ready && !inspecting && !loading && (
                  <div
                    css={styles.clickCatcher}
                    onClick={togglePlay}
                    data-test-subj="uxSessionReplayStageClick"
                    aria-hidden="true"
                  >
                    {!playing && (
                      <div css={styles.pausedGlyph}>
                        <div css={styles.pausedGlyphInner}>
                          <EuiIcon type="play" size="l" aria-hidden={true} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {inspecting && (
                <div css={styles.inspector} data-test-subj="uxSessionReplayInspector">
                  {inspected ? (
                    <InspectorPanel node={inspected} />
                  ) : (
                    <EuiText size="s" color="subdued">
                      {i18n.translate('xpack.ux.sessionReplay.player.inspectHint', {
                        defaultMessage: 'Hover to highlight, click an element to inspect it.',
                      })}
                    </EuiText>
                  )}
                </div>
              )}
            </div>

            <div css={styles.controls}>
              <UxTourAnchor stepId="player" display="block">
                <div
                  ref={timelineRef}
                  css={styles.timeline}
                  onClick={onTimelineClick}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft') {
                      event.preventDefault();
                      seekToPct(progressPct - 5);
                    } else if (event.key === 'ArrowRight') {
                      event.preventDefault();
                      seekToPct(progressPct + 5);
                    } else if (event.key === 'Home') {
                      event.preventDefault();
                      seekToPct(0);
                    } else if (event.key === 'End') {
                      event.preventDefault();
                      seekToPct(100);
                    }
                  }}
                  tabIndex={controlsDisabled ? -1 : 0}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPct)}
                  aria-label={i18n.translate('xpack.ux.sessionReplay.player.timelineAria', {
                    defaultMessage: 'Replay progress',
                  })}
                  data-test-subj="uxSessionReplayTimeline"
                >
                  <div css={styles.played} style={{ width: `${progressPct}%` }} />
                  {markers.map((marker, index) => (
                    <div
                      key={`${marker.kind}-${index}`}
                      css={styles.marker}
                      style={{
                        left: `${marker.pct}%`,
                        background:
                          marker.kind === 'page'
                            ? euiTheme.colors.accent
                            : euiTheme.colors.textSubdued,
                      }}
                      title={marker.label}
                    />
                  ))}
                  <div css={styles.cursor} style={{ left: `${progressPct}%` }} />
                </div>

                <div css={styles.metaRow}>
                  <EuiToolTip
                    content={
                      playing
                        ? i18n.translate('xpack.ux.sessionReplay.player.pause', {
                            defaultMessage: 'Pause',
                          })
                        : i18n.translate('xpack.ux.sessionReplay.player.play', {
                            defaultMessage: 'Play',
                          })
                    }
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      display="fill"
                      size="m"
                      iconType={playing ? 'pause' : 'play'}
                      onClick={togglePlay}
                      isDisabled={controlsDisabled}
                      aria-label={
                        playing
                          ? i18n.translate('xpack.ux.sessionReplay.player.pause', {
                              defaultMessage: 'Pause',
                            })
                          : i18n.translate('xpack.ux.sessionReplay.player.play', {
                              defaultMessage: 'Play',
                            })
                      }
                      data-test-subj="uxSessionReplayPlayPause"
                    />
                  </EuiToolTip>

                  <EuiToolTip
                    content={i18n.translate('xpack.ux.sessionReplay.player.restart', {
                      defaultMessage: 'Restart',
                    })}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      display="empty"
                      size="m"
                      iconType="refresh"
                      onClick={restart}
                      isDisabled={controlsDisabled}
                      aria-label={i18n.translate('xpack.ux.sessionReplay.player.restart', {
                        defaultMessage: 'Restart',
                      })}
                      data-test-subj="uxSessionReplayRestart"
                    />
                  </EuiToolTip>

                  <UxTourAnchor stepId="playerInspect">
                    <EuiToolTip
                      content={i18n.translate('xpack.ux.sessionReplay.player.inspect', {
                        defaultMessage: 'Inspect element',
                      })}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        display={inspecting ? 'fill' : 'empty'}
                        size="m"
                        iconType="inspect"
                        onClick={toggleInspect}
                        isDisabled={controlsDisabled}
                        isSelected={inspecting}
                        aria-label={i18n.translate('xpack.ux.sessionReplay.player.inspect', {
                          defaultMessage: 'Inspect element',
                        })}
                        data-test-subj="uxSessionReplayInspectToggle"
                      />
                    </EuiToolTip>
                  </UxTourAnchor>

                  <EuiText size="s" css={styles.clock} data-test-subj="uxSessionReplayClock">
                    {formatClock(currentMs)}
                    <span style={{ opacity: 0.55 }}> / {formatClock(totalMs)}</span>
                  </EuiText>

                  <EuiButtonGroup
                    legend={i18n.translate('xpack.ux.sessionReplay.player.speedLegend', {
                      defaultMessage: 'Playback speed',
                    })}
                    options={[
                      { id: '1', label: '1×' },
                      { id: '2', label: '2×' },
                      { id: '4', label: '4×' },
                    ]}
                    idSelected={speed}
                    onChange={(id) => setSpeed(id)}
                    buttonSize="compressed"
                    isDisabled={controlsDisabled}
                  />

                  <EuiToolTip
                    content={i18n.translate('xpack.ux.sessionReplay.player.skipIdleTooltip', {
                      defaultMessage:
                        'Jump over gaps longer than 2 seconds with no recorded activity',
                    })}
                  >
                    <EuiSwitch
                      compressed
                      label={i18n.translate('xpack.ux.sessionReplay.player.skipIdleToggleSwitch', {
                        defaultMessage: 'Skip idle',
                      })}
                      checked={skipIdle}
                      onChange={(event) => setSkipIdle(event.target.checked)}
                      disabled={controlsDisabled}
                      data-test-subj="uxSessionReplaySkipIdle"
                    />
                  </EuiToolTip>

                  <div css={styles.metaSpacer} />

                  <EuiBadge color="hollow">
                    {i18n.translate('xpack.ux.sessionReplay.player.eventCount', {
                      defaultMessage: '{count} events',
                      values: { count: eventCount },
                    })}
                  </EuiBadge>
                </div>
              </UxTourAnchor>
            </div>
          </EuiPanel>
        )}
      </PageTemplateComponent>
    </div>
  );
}
