/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTourStep,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ApplicationStart, CoreStart, HttpStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import {
  ALERTS_INBOX_PATH,
  ALERTING_RULES_HUB_PATH,
  OBSERVABILITY_BASE_PATH,
} from '../../../common/locators/paths';
import { useKibana } from '../../utils/kibana_react';

/**
 * POC guided tour for Observability **solution** nav only.
 * Survives app switches via a document.body root. Started from plugin.start
 * (not only Observability App mount) so it works on management pages too.
 *
 * Solution chrome (projectSideNavV2) uses `nav-item-id-*` test subjects —
 * not `kbnChromeNav-primaryItem-*`.
 */

interface TourServices {
  application: ApplicationStart;
  http: HttpStart;
  core: CoreStart;
}

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourStepConfig {
  id: string;
  title: string;
  content: string;
  selectors: string[];
  href?: string;
  openAlertsPanel?: boolean;
}

/** Alerts primary rail button — V2 solution nav. */
const ALERTS_PRIMARY_SELECTORS = [
  '[data-test-subj~="nav-item-id-alerts"]',
  '[data-test-subj="kbnChromeNav-primaryItem-alerts"]',
];

const TOUR_STEPS: TourStepConfig[] = [
  {
    id: 'alerts',
    title: i18n.translate('xpack.observability.alertingIaTour.step1.title', {
      defaultMessage: 'Alerts have a new home',
    }),
    content: i18n.translate('xpack.observability.alertingIaTour.step1.content', {
      defaultMessage:
        'Alerts in Kibana have a new home. Open Alerts to access Alerts Inbox, Rules, SLOs, and Notifications & Suppressions in one place.',
    }),
    selectors: ALERTS_PRIMARY_SELECTORS,
  },
  {
    id: 'inbox',
    title: i18n.translate('xpack.observability.alertingIaTour.step2.title', {
      defaultMessage: 'A unified Alerts Inbox',
    }),
    content: i18n.translate('xpack.observability.alertingIaTour.step2.content', {
      defaultMessage:
        'View all your internal and external alerts in one place. Import alerts from external systems to investigate and take action alongside Kibana alerts.',
    }),
    selectors: [
      '[data-test-subj~="nav-item-id-alerts_inbox_demo"]',
      '[data-test-subj~="nav-item-id-alerts_inbox"]',
      '[data-test-subj="kbnChromeNav-sidePanelItem-alerts_inbox_demo"]',
      '[data-test-subj="kbnChromeNav-sidePanelItem-alerts_inbox"]',
    ],
    href: `${OBSERVABILITY_BASE_PATH}${ALERTS_INBOX_PATH}`,
    openAlertsPanel: true,
  },
  {
    id: 'actionPolicies',
    title: i18n.translate('xpack.observability.alertingIaTour.step3.title', {
      defaultMessage: 'Reusable Action Policies',
    }),
    content: i18n.translate('xpack.observability.alertingIaTour.step3.content', {
      defaultMessage:
        'Configure notification settings once with Action Policies and reuse them across your rules. Connect them to Workflows to automate follow-up actions.',
    }),
    selectors: [
      '[data-test-subj~="nav-item-id-alerts_action_policies_demo"]',
      '[data-test-subj~="nav-item-id-alerts_action_policies"]',
      '[data-test-subj="kbnChromeNav-sidePanelItem-alerts_action_policies_demo"]',
      '[data-test-subj="kbnChromeNav-sidePanelItem-alerts_action_policies"]',
    ],
    href: '/app/management/insightsAndAlerting/action_policies',
    openAlertsPanel: true,
  },
  {
    id: 'rules',
    title: i18n.translate('xpack.observability.alertingIaTour.step4.title', {
      defaultMessage: 'Create and manage rules',
    }),
    content: i18n.translate('xpack.observability.alertingIaTour.step4.content', {
      defaultMessage:
        'Create alerting rules, monitor their status, and manage existing rules from a single location.',
    }),
    selectors: [
      '[data-test-subj~="nav-item-id-alerts_rules_hub"]',
      '[data-test-subj~="nav-item-id-observability-overview:alerting_rules_hub"]',
      '[data-test-subj="kbnChromeNav-sidePanelItem-alerts_rules_hub"]',
      '[data-test-subj="kbnChromeNav-sidePanelItem-observability-overview:alerting_rules_hub"]',
    ],
    href: `${OBSERVABILITY_BASE_PATH}${ALERTING_RULES_HUB_PATH}`,
    openAlertsPanel: true,
  },
];

function queryFirst(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el instanceof HTMLElement) {
        return el;
      }
    } catch {
      // Invalid selector variants are skipped.
    }
  }
  return null;
}

function readRect(el: HTMLElement): AnchorRect {
  const { top, left, width, height } = el.getBoundingClientRect();
  return { top, left, width: Math.max(width, 8), height: Math.max(height, 8) };
}

function isAlertsPanelOpen(): boolean {
  return Boolean(
    document.querySelector('[data-test-subj~="kbnChromeNav-sidePanel_alerts"]') ||
      document.querySelector('[data-test-subj~="nav-item-id-alerts_inbox"]') ||
      document.querySelector('[data-test-subj~="nav-item-id-alerts_inbox_demo"]')
  );
}

function openAlertsPanel(): void {
  if (isAlertsPanelOpen()) {
    return;
  }
  queryFirst(ALERTS_PRIMARY_SELECTORS)?.click();
}

function waitForElement(selectors: string[], timeoutMs = 3000): Promise<HTMLElement | null> {
  const existing = queryFirst(selectors);
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    const started = Date.now();
    const intervalId = window.setInterval(() => {
      const el = queryFirst(selectors);
      if (el || Date.now() - started > timeoutMs) {
        window.clearInterval(intervalId);
        resolve(el);
      }
    }, 100);
  });
}

async function activateStep(
  step: TourStepConfig,
  services: TourServices
): Promise<HTMLElement | null> {
  if (step.openAlertsPanel) {
    openAlertsPanel();
    await waitForElement(step.selectors, 1500);
  }

  if (step.href) {
    await services.application.navigateToUrl(services.http.basePath.prepend(step.href));
    await new Promise((r) => window.setTimeout(r, 400));
    if (step.openAlertsPanel) {
      openAlertsPanel();
    }
  }

  return waitForElement(step.selectors, 3000);
}

function AlertingIaTourUi({
  services,
  onFinished,
}: {
  services: TourServices;
  onFinished: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const anchorElRef = useRef<HTMLElement | null>(null);

  const step = TOUR_STEPS[stepIndex];
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const el = await waitForElement(TOUR_STEPS[0].selectors, 30000);
      if (cancelled) {
        return;
      }
      if (!el) {
        stopAlertingIaTour();
        return;
      }
      anchorElRef.current = el;
      setAnchorRect(readRect(el));
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!anchorRect) {
      return;
    }

    const sync = () => {
      const el = anchorElRef.current ?? queryFirst(step.selectors);
      if (el) {
        anchorElRef.current = el;
        setAnchorRect(readRect(el));
      }
    };

    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    const intervalId = window.setInterval(sync, 250);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [anchorRect, step.selectors]);

  const goNext = useCallback(async () => {
    if (isLastStep) {
      onFinished();
      return;
    }

    const nextIndex = stepIndex + 1;
    const nextStep = TOUR_STEPS[nextIndex];
    setIsPreparing(true);
    try {
      const el = await activateStep(nextStep, services);
      if (el) {
        anchorElRef.current = el;
        setAnchorRect(readRect(el));
      }
      setStepIndex(nextIndex);
    } finally {
      setIsPreparing(false);
    }
  }, [isLastStep, onFinished, services, stepIndex]);

  const footerAction = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" color="text" onClick={onFinished} disabled={isPreparing}>
            {i18n.translate('xpack.observability.alertingIaTour.closeTour', {
              defaultMessage: 'Close tour',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" color="success" onClick={goNext} isLoading={isPreparing}>
            {isLastStep
              ? i18n.translate('xpack.observability.alertingIaTour.done', {
                  defaultMessage: 'Done',
                })
              : i18n.translate('xpack.observability.alertingIaTour.next', {
                  defaultMessage: 'Next',
                })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [goNext, isLastStep, isPreparing, onFinished]
  );

  if (!anchorRect) {
    return null;
  }

  const beaconSize = 12;
  const beaconTop = anchorRect.top + (anchorRect.height - beaconSize) / 2;
  const beaconLeft = anchorRect.left + anchorRect.width - beaconSize / 2;

  return (
    <div
      data-test-subj="alertingIaTourAnchorProxy"
      css={css`
        position: fixed;
        top: ${beaconTop}px;
        left: ${beaconLeft}px;
        width: ${beaconSize}px;
        height: ${beaconSize}px;
        z-index: 9000;
        pointer-events: none;
      `}
    >
      <EuiTourStep
        key={step.id}
        step={stepIndex + 1}
        stepsTotal={TOUR_STEPS.length}
        isStepOpen={true}
        onFinish={onFinished}
        title={step.title}
        subtitle={i18n.translate('xpack.observability.alertingIaTour.subtitle', {
          defaultMessage: 'New Alerting experience',
        })}
        content={
          <>
            <EuiText size="s">
              <p>{step.content}</p>
            </EuiText>
            <EuiSpacer size="s" />
          </>
        }
        anchorPosition="rightUp"
        maxWidth={360}
        decoration="beacon"
        footerAction={footerAction}
        zIndex={9001}
      >
        <span
          aria-hidden
          css={css`
            display: block;
            width: 100%;
            height: 100%;
          `}
        />
      </EuiTourStep>
    </div>
  );
}

let tourRoot: Root | null = null;
let tourHost: HTMLDivElement | null = null;
let tourStarted = false;
let chromeStyleSub: { unsubscribe: () => void } | null = null;
let pluginInitDone = false;

function stopAlertingIaTour(): void {
  chromeStyleSub?.unsubscribe();
  chromeStyleSub = null;
  tourRoot?.unmount();
  tourRoot = null;
  tourHost?.remove();
  tourHost = null;
  tourStarted = false;
}

function startAlertingIaTour(services: TourServices): void {
  if (tourStarted) {
    return;
  }

  if (services.core.chrome.getChromeStyle() !== 'project') {
    return;
  }

  // Require the solution Alerts primary — classic category chrome won't have it
  // even if chrome style briefly reports project during transitions.
  if (!queryFirst(ALERTS_PRIMARY_SELECTORS)) {
    return;
  }

  tourStarted = true;

  tourHost = document.createElement('div');
  tourHost.setAttribute('data-test-subj', 'alertingIaTourHost');
  document.body.appendChild(tourHost);
  tourRoot = createRoot(tourHost);
  tourRoot.render(
    <KibanaRenderContextProvider {...services.core}>
      <AlertingIaTourUi services={services} onFinished={stopAlertingIaTour} />
    </KibanaRenderContextProvider>
  );

  chromeStyleSub = services.core.chrome.getChromeStyle$().subscribe((style) => {
    if (style !== 'project') {
      stopAlertingIaTour();
    }
  });
}

/**
 * Call from plugin.start so the tour can appear on any app (including
 * Stack Management) while solution Observability chrome is active.
 */
export function initAlertingIaTour(core: CoreStart): void {
  if (pluginInitDone) {
    return;
  }
  pluginInitDone = true;

  const services: TourServices = {
    application: core.application,
    http: core.http,
    core,
  };

  const tryStart = () => {
    startAlertingIaTour(services);
  };

  // Poll until solution Alerts primary exists (nav paints after plugin start).
  const intervalId = window.setInterval(() => {
    if (tourStarted) {
      window.clearInterval(intervalId);
      return;
    }
    if (core.chrome.getChromeStyle() === 'project') {
      tryStart();
    }
  }, 500);

  // Stop polling after 2 minutes to avoid leaking in classic chrome sessions.
  window.setTimeout(() => window.clearInterval(intervalId), 120000);

  core.chrome.getChromeStyle$().subscribe((style) => {
    if (style === 'project') {
      tryStart();
    } else {
      stopAlertingIaTour();
    }
  });
}

/**
 * Also mounted inside Observability App as a backup start trigger.
 */
export function AlertingIaTour() {
  const { services } = useKibana();

  useEffect(() => {
    const timeouts = [300, 1000, 2500].map((delay) =>
      window.setTimeout(() => {
        startAlertingIaTour({
          application: services.application,
          http: services.http,
          core: services,
        });
      }, delay)
    );

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [services]);

  return null;
}
