/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBanner,
  EuiButton,
  EuiButtonEmpty,
  EuiIllustration,
  EuiText,
  EuiTourStep,
  type EuiTourStepProps,
} from '@elastic/eui';
import { userPresentationLightBulb } from '@elastic/eui-illustrations';
import { i18n } from '@kbn/i18n';

/**
 * v.9 welcome callout + guided tour. State is intentionally not persisted:
 * a page refresh brings the callout back so the prototype can be replayed.
 */

const TOUR_POPOVER_WIDTH = 360;
/** Skip a step whose anchor never renders (e.g. no expandable rows after filtering). */
const ANCHOR_TIMEOUT_MS = 3000;

const DOCS_HREF = 'https://www.elastic.co/docs/solutions/security/advanced-entity-analytics';

const CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.v9.tour.calloutTitle',
  { defaultMessage: 'Smarter Entity analytics to kick off your hunt' }
);
const CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.v9.tour.calloutDescription',
  {
    defaultMessage:
      'See which users, hosts and services need attention, and why: six attention signals, entities resolved across your data sources, and a one-click AI brief. Take a short tour, or dive in.',
  }
);
const CALLOUT_START_TOUR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.v9.tour.calloutStartTour',
  { defaultMessage: 'Start tour' }
);
const CALLOUT_VIEW_DOCS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.v9.tour.calloutViewDocs',
  { defaultMessage: 'View docs' }
);
const CALLOUT_DISMISS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.v9.tour.calloutDismiss',
  { defaultMessage: 'Dismiss' }
);
const STEP_CLOSE_TOUR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.v9.tour.closeTour',
  { defaultMessage: 'Close tour' }
);
const STEP_NEXT = i18n.translate('xpack.securitySolution.entityAnalytics.facelift.v9.tour.next', {
  defaultMessage: 'Next',
});
const STEP_FINISH_TOUR = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.v9.tour.finishTour',
  { defaultMessage: 'Finish tour' }
);

interface TourStepConfig {
  id: string;
  anchor: string;
  anchorPosition: EuiTourStepProps['anchorPosition'];
  title: string;
  content: string;
}

const TOUR_STEPS: TourStepConfig[] = [
  {
    id: 'metrics',
    anchor: '[data-test-subj="eaFaceliftTourMetricsAnchor"]',
    anchorPosition: 'rightCenter',
    title: i18n.translate('xpack.securitySolution.entityAnalytics.facelift.v9.tour.metricsTitle', {
      defaultMessage: 'Start with what needs attention',
    }),
    content: i18n.translate(
      'xpack.securitySolution.entityAnalytics.facelift.v9.tour.metricsDescription',
      {
        defaultMessage:
          'Each metric counts entities matching one attention signal in the selected time range. Click a card to filter the table to those entities; click again to clear.',
      }
    ),
  },
  {
    id: 'huntWithAi',
    anchor: '[data-test-subj="eaFaceliftHuntWithAiButton"]',
    anchorPosition: 'downRight',
    title: i18n.translate(
      'xpack.securitySolution.entityAnalytics.facelift.v9.tour.huntWithAiTitle',
      { defaultMessage: 'Get a head start from AI' }
    ),
    content: i18n.translate(
      'xpack.securitySolution.entityAnalytics.facelift.v9.tour.huntWithAiDescription',
      {
        defaultMessage:
          'Let the AI agent suggest threat hunting leads: which entities to look at first, and why. Generate an AI brief of the current entity risk landscape and recommended next steps to share with your team or leadership.',
      }
    ),
  },
  {
    id: 'rows',
    anchor: '[data-test-subj="eaFaceliftRowsSelectorButton"]',
    anchorPosition: 'downCenter',
    title: i18n.translate('xpack.securitySolution.entityAnalytics.facelift.v9.tour.rowsTitle', {
      defaultMessage: 'Choose your level of detail',
    }),
    content: i18n.translate(
      'xpack.securitySolution.entityAnalytics.facelift.v9.tour.rowsDescription',
      {
        defaultMessage:
          'Each row is one entity, resolved from its records across different sources, which are nested underneath. Switch to Individual records to see every record on its own.',
      }
    ),
  },
];

const STEPS_TOTAL = TOUR_STEPS.length;

export interface ProductTourState {
  isCalloutVisible: boolean;
  /** 1-based; 0 when the tour is not running. */
  currentStep: number;
  startTour: () => void;
  nextStep: () => void;
  endTour: () => void;
  dismissCallout: () => void;
}

export const useProductTour = (): ProductTourState => {
  const [isCalloutDismissed, setIsCalloutDismissed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = useCallback(() => {
    setIsCalloutDismissed(true);
    setCurrentStep(1);
  }, []);
  const nextStep = useCallback(
    () => setCurrentStep((step) => (step >= STEPS_TOTAL ? 0 : step + 1)),
    []
  );
  const endTour = useCallback(() => setCurrentStep(0), []);
  const dismissCallout = useCallback(() => setIsCalloutDismissed(true), []);

  return useMemo(
    () => ({
      isCalloutVisible: !isCalloutDismissed,
      currentStep,
      startTour,
      nextStep,
      endTour,
      dismissCallout,
    }),
    [isCalloutDismissed, currentStep, startTour, nextStep, endTour, dismissCallout]
  );
};

export const ProductTourCallout: React.FC<{ tour: ProductTourState }> = ({ tour }) => (
  <EuiBanner
    title={CALLOUT_TITLE}
    text={CALLOUT_DESCRIPTION}
    media={<EuiIllustration type={userPresentationLightBulb} alt="" />}
    actionProps={{
      primary: {
        children: CALLOUT_START_TOUR,
        onClick: tour.startTour,
        'data-test-subj': 'eaFaceliftTourCalloutStart',
      },
      secondary: {
        children: CALLOUT_VIEW_DOCS,
        iconType: 'external',
        iconSide: 'right',
        href: DOCS_HREF,
        target: '_blank',
        rel: 'noopener',
        'data-test-subj': 'eaFaceliftTourCalloutDocs',
      },
    }}
    onDismiss={tour.dismissCallout}
    dismissButtonProps={{
      'aria-label': CALLOUT_DISMISS,
      'data-test-subj': 'eaFaceliftTourCalloutDismiss',
    }}
    data-test-subj="eaFaceliftTourCallout"
  />
);

const useIsAnchorMounted = (selector: string | undefined): boolean => {
  const [isMounted, setIsMounted] = useState(
    () => !!selector && !!document.querySelector(selector)
  );

  useEffect(() => {
    if (!selector) {
      setIsMounted(false);
      return;
    }
    const check = () => setIsMounted(!!document.querySelector(selector));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selector]);

  return isMounted;
};

export const ProductTour: React.FC<{ tour: ProductTourState }> = ({ tour }) => {
  const { currentStep, nextStep, endTour } = tour;
  const step = currentStep > 0 ? TOUR_STEPS[currentStep - 1] : undefined;
  const isAnchorMounted = useIsAnchorMounted(step?.anchor);

  useEffect(() => {
    if (!step || isAnchorMounted) return;
    const timer = setTimeout(nextStep, ANCHOR_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [step, isAnchorMounted, nextStep]);

  useEffect(() => {
    if (!step || !isAnchorMounted) return;
    document.querySelector(step.anchor)?.scrollIntoView({ block: 'nearest' });
  }, [step, isAnchorMounted]);

  // EuiTourStep resolves its anchor once on mount, so wait for the element.
  if (!step || !isAnchorMounted) {
    return null;
  }

  const isLastStep = currentStep === STEPS_TOTAL;

  return (
    <EuiTourStep
      // Remount per step: EuiWrappingPopover moves the anchor into the popover
      // and only puts it back on unmount.
      key={step.id}
      anchor={step.anchor}
      anchorPosition={step.anchorPosition}
      repositionOnScroll
      title={step.title}
      content={
        <EuiText size="s">
          <p>{step.content}</p>
        </EuiText>
      }
      step={currentStep}
      stepsTotal={STEPS_TOTAL}
      isStepOpen
      minWidth={TOUR_POPOVER_WIDTH}
      maxWidth={TOUR_POPOVER_WIDTH}
      onFinish={endTour}
      data-test-subj={`eaFaceliftTourStep-${step.id}`}
      footerAction={
        isLastStep ? (
          <EuiButton
            color="success"
            size="s"
            onClick={endTour}
            data-test-subj="eaFaceliftTourFinish"
          >
            {STEP_FINISH_TOUR}
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty
              key="close"
              size="s"
              color="text"
              onClick={endTour}
              data-test-subj="eaFaceliftTourClose"
            >
              {STEP_CLOSE_TOUR}
            </EuiButtonEmpty>,
            <EuiButton
              key="next"
              color="success"
              size="s"
              onClick={nextStep}
              data-test-subj="eaFaceliftTourNext"
            >
              {STEP_NEXT}
            </EuiButton>,
          ]
        )
      }
    />
  );
};
