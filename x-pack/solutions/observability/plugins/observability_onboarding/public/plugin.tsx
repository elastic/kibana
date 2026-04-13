/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSplitButton,
  EuiSuperSelect,
  EuiText,
  EuiToolTip,
  euiFontSize,
  euiShadow,
  useEuiTheme,
} from '@elastic/eui';
import type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import type { FleetSetup, FleetStart } from '@kbn/fleet-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import type { StreamsPluginStart } from '@kbn/streams-plugin/public';
import type { StreamsAppPublicStart } from '@kbn/streams-app-plugin/public';
import type { ObservabilityOnboardingConfig } from '../server';
import { PLUGIN_ID } from '../common';
import { ObservabilityOnboardingLocatorDefinition } from './locators/onboarding_locator/locator_definition';
import type { ObservabilityOnboardingPluginLocators } from './locators';
import type { ConfigSchema } from '.';
import {
  OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_FLOW_ERROR_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_FLOW_DATASET_DETECTED_TELEMETRY_EVENT,
  OBSERVABILITY_ONBOARDING_WIRED_STREAMS_AUTO_ENABLED_EVENT,
} from '../common/telemetry_events';

import { versionStore } from './application/version_switcher_store';
import type { IngestHubVersion } from './application/version_switcher_store';
import {
  annotationCanvasVisibility,
  requestEnterAnnotationMode,
  requestRemoveAllAnnotationsPrompt,
} from './application/onboarding_annotation_chrome_store';
import {
  isAppleLikeClientPlatform,
  isEditableKeyboardTarget,
  isPrimaryModifier,
} from './application/onboarding_shortcut_helpers';
import { DiscoverTour } from './application/discover_tour';
const VERSION_OPTIONS = [
  {
    value: 'version1' as IngestHubVersion,
    inputDisplay: 'Version 1',
    dropdownDisplay: (
      <>
        <strong>Version 1</strong>
        <EuiText size="s" color="subdued">
          <p>Near-term fixes (Add Data, AWS, Kubernetes).</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'version2' as IngestHubVersion,
    inputDisplay: 'Version 2',
    dropdownDisplay: (
      <>
        <strong>Version 2</strong>
        <EuiText size="s" color="subdued">
          <p>
            &ldquo;Everything is a stream&rdquo; canvas vision + AI-assisted onboarding +
            AI-generated integrations + progressive disclosure principles.
          </p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'streamsUx' as IngestHubVersion,
    inputDisplay: 'Streams',
    dropdownDisplay: (
      <>
        <strong>Streams</strong>
        <EuiText size="s" color="subdued">
          <p>User lands in Kibana and is pushed to add data but can skip the flow.</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'agentUx' as IngestHubVersion,
    inputDisplay: 'Agent',
    dropdownDisplay: (
      <>
        <strong>Agent</strong>
        <EuiText size="s" color="subdued">
          <p>Same as Streams: classic Observability without Add data emphasis.</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'aiSourceMap' as IngestHubVersion,
    inputDisplay: 'AI SourceMap',
    dropdownDisplay: (
      <>
        <strong>AI SourceMap</strong>
        <EuiText size="s" color="subdued">
          <p>User lands in Kibana and is pushed to add data but can skip the flow.</p>
        </EuiText>
      </>
    ),
  },
];

/** Widest toolbar label among `inputDisplay` values (strings only); keeps switcher width stable. */
const LONGEST_VERSION_TOOLBAR_LABEL = VERSION_OPTIONS.reduce<string>((longest, option) => {
  const label = typeof option.inputDisplay === 'string' ? option.inputDisplay : '';
  return label.length > longest.length ? label : longest;
}, '');

const VersionSwitcherNavControl: React.FC<{
  navigateToApp?: (appId: string, options?: { path?: string }) => Promise<void>;
}> = ({ navigateToApp }) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const toolbarVersionFontSize = euiFontSize(euiThemeContext, 's').fontSize;
  /** Matches EUI compressed control: `padding-left/right` = `size.s` + `size.base * 1.5` per right icon. */
  const versionSwitcherTriggerInlineSizePx = React.useMemo(() => {
    const padCompressed = parseFloat(String(euiTheme.size.s));
    const iconAffordance = parseFloat(String(euiTheme.size.base)) * 1.5;
    const borderAllowance = 2;
    const horizontalChrome =
      (Number.isFinite(padCompressed) ? padCompressed : 12) * 2 +
      (Number.isFinite(iconAffordance) ? iconAffordance : 24) +
      borderAllowance;

    if (typeof document === 'undefined') {
      return Math.ceil(LONGEST_VERSION_TOOLBAR_LABEL.length * 9 + horizontalChrome);
    }
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) {
      return Math.ceil(LONGEST_VERSION_TOOLBAR_LABEL.length * 9 + horizontalChrome);
    }
    ctx.font = `${euiTheme.font.weight.regular} ${toolbarVersionFontSize} ${euiTheme.font.family}`;
    return Math.ceil(ctx.measureText(LONGEST_VERSION_TOOLBAR_LABEL).width + horizontalChrome);
  }, [euiTheme, toolbarVersionFontSize]);
  const toolbarPanelShadow = euiShadow(euiThemeContext, 'xs', { direction: 'down' });
  /** `euiShadow` returns a full `box-shadow: …;` declaration — do not prefix with `box-shadow:` again. */
  const toolbarPanelShadowCss = toolbarPanelShadow.includes('box-shadow')
    ? toolbarPanelShadow.replace(/(box-shadow:[^;]+);/m, '$1 !important;')
    : toolbarPanelShadow;
  /** Matches `EuiButtonIcon` `size="xs"` height (`euiButtonSizeMap().xs.height`). */
  const toolbarControlHeight = euiTheme.size.l;
  const [active, setActive] = React.useState<IngestHubVersion>(versionStore.getSnapshot());
  const [portalEl, setPortalEl] = React.useState<HTMLDivElement | null>(null);
  const toolbarPortalHostRef = React.useRef<HTMLDivElement | null>(null);
  const annotateShortcut = React.useMemo(
    () => (isAppleLikeClientPlatform() ? '⇧⌘K' : 'Shift+Ctrl+K'),
    []
  );
  const visibilityShortcut = React.useMemo(
    () => (isAppleLikeClientPlatform() ? '⇧⌘L' : 'Shift+Ctrl+L'),
    []
  );
  const annotationsVisible = useSyncExternalStore(
    annotationCanvasVisibility.subscribe,
    annotationCanvasVisibility.getSnapshot,
    annotationCanvasVisibility.getServerSnapshot
  );
  const [annotationsActionsMenuOpen, setAnnotationsActionsMenuOpen] = React.useState(false);
  const annotationsMenuItems = React.useMemo(
    () => [
      <EuiContextMenuItem
        key="removeAllAnnotations"
        data-test-subj="observabilityOnboardingToolbarRemoveAllAnnotations"
        icon={<EuiIcon type="trash" size="m" color="danger" />}
        onClick={() => {
          setAnnotationsActionsMenuOpen(false);
          requestRemoveAllAnnotationsPrompt();
        }}
      >
        Remove all annotations
      </EuiContextMenuItem>,
    ],
    []
  );
  React.useLayoutEffect(() => {
    const el = document.createElement('div');
    toolbarPortalHostRef.current = el;
    el.id = 'obsOnboardingToolbarPortal';
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.zIndex = '2147483647';
    el.style.overflow = 'visible';
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      toolbarPortalHostRef.current = null;
      document.body.removeChild(el);
      setPortalEl(null);
    };
  }, []);

  React.useLayoutEffect(() => {
    const el = toolbarPortalHostRef.current;
    if (!el || !portalEl) {
      return;
    }

    const fallbackHostHeightPx = () => {
      const rowPx = parseFloat(String(toolbarControlHeight));
      const row = Number.isFinite(rowPx) ? rowPx : 32;
      /** `EuiPanel` uses `style={{ padding: 8 }}` (16px vertical) + `hasBorder` (thin top+bottom). */
      return Math.ceil(16 + row + 2);
    };

    const parseCssPx = (value: string): number => {
      const n = parseFloat(value.trim());
      return Number.isFinite(n) ? n : 0;
    };

    const syncToolbarVertical = () => {
      const panel = el.querySelector<HTMLElement>('[data-onboarding-toolbar-panel]');
      const measured = panel ? panel.getBoundingClientRect().height : 0;
      const hostPx = measured > 0 ? Math.ceil(measured) : fallbackHostHeightPx();

      const cs = getComputedStyle(document.documentElement);
      const topBarH = parseCssPx(cs.getPropertyValue('--kbn-application--top-bar-height'));
      const topBarT = parseCssPx(cs.getPropertyValue('--kbn-application--top-bar-top'));
      const headerH = parseCssPx(cs.getPropertyValue('--kbn-layout--header-height'));
      const headerT = parseCssPx(cs.getPropertyValue('--kbn-layout--header-top'));

      const useTopBar = topBarH > 0;
      const rowTop = useTopBar ? topBarT : headerT;
      let rowHeight: number;
      if (useTopBar) {
        rowHeight = topBarH;
      } else if (headerH > 0) {
        rowHeight = headerH;
      } else {
        rowHeight = hostPx;
      }

      el.style.top = `${Math.round(rowTop + (rowHeight - hostPx) / 2)}px`;
    };

    syncToolbarVertical();
    const raf1 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(syncToolbarVertical);
    });
    const delayed = window.setTimeout(syncToolbarVertical, 300);
    window.addEventListener('resize', syncToolbarVertical);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.clearTimeout(delayed);
      window.removeEventListener('resize', syncToolbarVertical);
    };
  }, [portalEl, toolbarControlHeight]);

  React.useEffect(() => {
    return versionStore.subscribe(() => setActive(versionStore.getSnapshot()));
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isEditableKeyboardTarget(e.target)) return;
      if (isPrimaryModifier(e) && e.key.toLowerCase() === 'l' && e.shiftKey && !e.altKey) {
        e.preventDefault();
        annotationCanvasVisibility.toggleCanvas();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const applyIngestHubVersion = React.useCallback(
    (value: IngestHubVersion) => {
      versionStore.setVersion(value);
      sessionStorage.removeItem('ingestHub:showDiscoverTour');
      sessionStorage.removeItem('ingestHub:dataAdded');
      if (value === 'agentUx' || value === 'version1' || value === 'version2') {
        navigateToApp?.('observability-overview');
      } else {
        const path = value === 'blockUx' ? '/ingest-hub/integrations' : '/ingest-hub';
        navigateToApp?.(PLUGIN_ID, { path });
      }
    },
    [navigateToApp]
  );

  if (!portalEl) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <style>{`.onboardingSwitcherTooltip { z-index: 2147483647 !important; }`}</style>
      <style>{`
        #obsOnboardingToolbarPortal {
          overflow: visible;
        }
        #obsOnboardingToolbarPortal .euiPanel {
          ${toolbarPanelShadowCss}
          overflow: visible;
        }
        #obsOnboardingToolbarPortal .euiFormControlLayout {
          min-height: ${toolbarControlHeight};
          height: ${toolbarControlHeight};
          /* Fixed to longest option label so the toolbar does not resize when the selection changes */
          inline-size: ${versionSwitcherTriggerInlineSizePx}px;
          min-inline-size: ${versionSwitcherTriggerInlineSizePx}px;
          max-inline-size: ${versionSwitcherTriggerInlineSizePx}px;
        }
        #obsOnboardingToolbarPortal .euiFormControlLayout__childrenWrapper {
          min-height: ${toolbarControlHeight};
          height: 100%;
          display: flex;
          align-items: stretch;
        }
        #obsOnboardingToolbarPortal .euiSuperSelectControl {
          min-height: ${toolbarControlHeight};
          height: ${toolbarControlHeight};
          display: flex;
          align-items: center;
          line-height: 1 !important;
          /* Do not set padding-inline — EUI reserves end space for the dropdown chevron via icon affordance. */
          inline-size: 100%;
          min-inline-size: 0;
          max-inline-size: none;
          overflow: visible !important;
          text-overflow: clip !important;
          white-space: nowrap;
          font-size: ${toolbarVersionFontSize};
        }
        #obsOnboardingToolbarPortal .euiSuperSelectControl .eui-textTruncate {
          overflow: visible !important;
          text-overflow: clip !important;
          max-inline-size: none !important;
        }
      `}</style>
      <EuiPanel
        data-onboarding-toolbar-panel
        paddingSize="none"
        hasShadow={false}
        hasBorder
        grow={false}
        style={{ maxWidth: 520, padding: 8 }}
      >
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
          <EuiFlexItem
            grow={false}
            css={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <EuiSuperSelect
              data-test-subj="observabilityOnboardingToolbarVersionSuperSelect"
              options={VERSION_OPTIONS}
              valueOfSelected={active}
              onChange={(value) => applyIngestHubVersion(value)}
              compressed
              hasDividers
              fullWidth={false}
              aria-label="Onboarding experience version"
              popoverProps={{
                zIndex: 2147483647,
                repositionOnScroll: true,
                panelMinWidth: 320,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={{
              alignSelf: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              paddingInline: euiTheme.size.xs,
            }}
          >
            <span
              aria-hidden
              css={{
                display: 'block',
                inlineSize: euiTheme.border.width.thin,
                blockSize: `calc(${toolbarControlHeight} - ${euiTheme.size.xs} - ${euiTheme.size.xs})`,
                backgroundColor: euiTheme.colors.borderBasePlain,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={{
              alignSelf: 'center',
              flexShrink: 0,
            }}
          >
            <EuiSplitButton size="xs">
              <EuiSplitButton.ActionPrimary
                isIconOnly
                iconType="editorComment"
                data-test-subj="observabilityOnboardingToolbarAddAnnotation"
                aria-label={`Add annotation (${annotateShortcut})`}
                onClick={() => requestEnterAnnotationMode()}
                tooltipProps={{
                  content: `Add annotation (${annotateShortcut})`,
                  anchorClassName: 'onboardingSwitcherTooltip',
                  disableScreenReaderOutput: true,
                }}
              />
              <EuiSplitButton.ActionSecondary
                data-test-subj="observabilityOnboardingToolbarAnnotationsActionsMenu"
                aria-label="Annotation options"
                aria-expanded={annotationsActionsMenuOpen}
                onClick={() => setAnnotationsActionsMenuOpen((open) => !open)}
                tooltipProps={{
                  content: 'Annotation options',
                  anchorClassName: 'onboardingSwitcherTooltip',
                  disableScreenReaderOutput: true,
                }}
                popoverProps={{
                  isOpen: annotationsActionsMenuOpen,
                  closePopover: () => setAnnotationsActionsMenuOpen(false),
                  anchorPosition: 'downRight',
                  panelPaddingSize: 'none',
                  zIndex: 2147483647,
                  repositionOnScroll: true,
                  children: <EuiContextMenuPanel size="s" items={annotationsMenuItems} />,
                }}
              />
            </EuiSplitButton>
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={{
              alignSelf: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              paddingInline: euiTheme.size.xs,
            }}
          >
            <span
              aria-hidden
              css={{
                display: 'block',
                inlineSize: euiTheme.border.width.thin,
                blockSize: `calc(${toolbarControlHeight} - ${euiTheme.size.xs} - ${euiTheme.size.xs})`,
                backgroundColor: euiTheme.colors.borderBasePlain,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                annotationsVisible
                  ? `Hide annotations (${visibilityShortcut})`
                  : `Show annotations (${visibilityShortcut})`
              }
              anchorClassName="onboardingSwitcherTooltip"
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                data-test-subj="observabilityOnboardingToolbarToggleAnnotationsVisibility"
                display={annotationsVisible ? 'base' : 'empty'}
                size="xs"
                iconType={annotationsVisible ? 'eye' : 'eyeClosed'}
                aria-pressed={annotationsVisible}
                color={annotationsVisible ? 'success' : 'text'}
                aria-label={
                  annotationsVisible
                    ? `Hide annotations (${visibilityShortcut})`
                    : `Show annotations (${visibilityShortcut})`
                }
                onClick={() => annotationCanvasVisibility.toggleCanvas()}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <DiscoverTour />
    </>,
    portalEl
  );
};

export type ObservabilityOnboardingPluginSetup = void;
export type ObservabilityOnboardingPluginStart = void;

export interface ObservabilityOnboardingPluginSetupDeps {
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  discover: DiscoverSetup;
  share: SharePluginSetup;
  fleet: FleetSetup;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface ObservabilityOnboardingPluginStartDeps {
  data: DataPublicPluginStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  discover: DiscoverStart;
  share: SharePluginStart;
  fleet: FleetStart;
  cloud?: CloudStart;
  usageCollection?: UsageCollectionStart;
  streams?: StreamsPluginStart;
  streamsApp?: StreamsAppPublicStart;
}

export type ObservabilityOnboardingContextValue = CoreStart &
  ObservabilityOnboardingPluginStartDeps & { config: ConfigSchema };

export class ObservabilityOnboardingPlugin
  implements Plugin<ObservabilityOnboardingPluginSetup, ObservabilityOnboardingPluginStart>
{
  private locators?: ObservabilityOnboardingPluginLocators;

  constructor(private readonly ctx: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ObservabilityOnboardingPluginSetupDeps) {
    const stackVersion = this.ctx.env.packageInfo.version;
    const config = this.ctx.config.get<ObservabilityOnboardingConfig>();
    const isServerlessBuild = this.ctx.env.packageInfo.buildFlavor === 'serverless';
    const isDevEnvironment = this.ctx.env.mode.dev;
    const pluginSetupDeps = plugins;

    core.application.register({
      id: PLUGIN_ID,
      title: 'Observability Onboarding',
      order: 8500,
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
      keywords: ['add data'],
      deepLinks: [
        {
          id: 'ingest-hub',
          title: 'Get started',
          path: '/ingest-hub',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-integrations',
          title: 'Add data',
          path: '/ingest-hub/integrations',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-platform-migration',
          title: 'Platform Migration',
          path: '/ingest-hub/platform-migration',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-dashboards',
          title: 'Dashboards',
          path: '/ingest-hub/dashboards',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-rules',
          title: 'Rules & Monitors',
          path: '/ingest-hub/rules',
          visibleIn: [],
        },
        {
          id: 'ingest-hub-data-management',
          title: 'Data management',
          path: '/ingest-hub/data-management',
          visibleIn: [],
        },
      ],
      async mount(appMountParameters: AppMountParameters) {
        // Load application bundle and Get start service
        const [{ renderApp }, [coreStart, corePlugins]] = await Promise.all([
          import('./application/app'),
          core.getStartServices(),
        ]);

        const { createCallApi } = await import('./services/rest/create_call_api');

        createCallApi(core);

        return renderApp({
          core: coreStart,
          deps: pluginSetupDeps,
          appMountParameters,
          corePlugins: corePlugins as ObservabilityOnboardingPluginStartDeps,
          config,
          context: {
            isDev: isDevEnvironment,
            isCloud: Boolean(pluginSetupDeps.cloud?.isCloudEnabled),
            isServerless: Boolean(pluginSetupDeps.cloud?.isServerlessEnabled) || isServerlessBuild,
            stackVersion,
            cloudServiceProvider: pluginSetupDeps.cloud?.csp,
          },
        });
      },
      visibleIn: ['globalSearch'],
    });

    this.locators = {
      onboarding: plugins.share.url.locators.create(new ObservabilityOnboardingLocatorDefinition()),
    };

    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT);
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT);
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_FLOW_PROGRESS_TELEMETRY_EVENT);
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_FLOW_ERROR_TELEMETRY_EVENT);
    core.analytics.registerEventType(
      OBSERVABILITY_ONBOARDING_FLOW_DATASET_DETECTED_TELEMETRY_EVENT
    );
    core.analytics.registerEventType(OBSERVABILITY_ONBOARDING_WIRED_STREAMS_AUTO_ENABLED_EVENT);

    return {
      locators: this.locators,
      getLocator: () => this.locators?.onboarding,
    };
  }
  public start(core: CoreStart, _plugins: ObservabilityOnboardingPluginStartDeps) {
    core.chrome.navControls.registerRight({
      order: 9000,
      mount: (element) => {
        ReactDOM.render(
          core.rendering.addContext(
            <VersionSwitcherNavControl navigateToApp={core.application.navigateToApp} />
          ),
          element,
          () => {}
        );
        return () => {
          ReactDOM.unmountComponentAtNode(element);
        };
      },
    });

    return {
      locators: this.locators,
    };
  }
}
