/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTourStepProps } from '@elastic/eui';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../common/constants';
import { HUNT_WITH_AI_BUTTON_TEST_ID } from '../hunt_with_ai_button';
import {
  AI_STEP_CONTENT,
  AI_STEP_TITLE,
  ATTENTION_STEP_CONTENT,
  ATTENTION_STEP_TITLE,
  ROWS_STEP_CONTENT,
  ROWS_STEP_TITLE,
} from './translations';

export const PRODUCT_TOUR_BANNER_STORAGE_KEY =
  NEW_FEATURES_TOUR_STORAGE_KEYS.ENTITY_ANALYTICS_HOME_PAGE_BANNER;

export const ADVANCED_ENTITY_ANALYTICS_DOCS_URL =
  'https://www.elastic.co/docs/solutions/security/advanced-entity-analytics';

export const SIGNAL_CARDS_TOUR_ANCHOR_TEST_ID = 'eaTourSignalCardsAnchor';
export const ROWS_MODE_SELECTOR_TEST_ID = 'eaRowsModeSelector';

export const PRODUCT_TOUR_BANNER_TEST_ID = 'eaProductTourBanner';
export const PRODUCT_TOUR_START_TEST_ID = 'eaProductTourBannerStart';
export const PRODUCT_TOUR_DOCS_TEST_ID = 'eaProductTourBannerDocs';
export const PRODUCT_TOUR_DISMISS_TEST_ID = 'eaProductTourBannerDismiss';
export const PRODUCT_TOUR_NEXT_TEST_ID = 'eaProductTourNext';
export const PRODUCT_TOUR_CLOSE_TEST_ID = 'eaProductTourClose';
export const PRODUCT_TOUR_FINISH_TEST_ID = 'eaProductTourFinish';
export const getProductTourStepTestId = (stepId: string): string => `eaProductTourStep-${stepId}`;

/** Skip a step whose anchor never renders, e.g. the attention step when no cards load. */
export const ANCHOR_TIMEOUT_MS = 3000;

export const TOUR_POPOVER_WIDTH = 360;

const bySubj = (testId: string): string => `[data-test-subj="${testId}"]`;

export const HUNT_WITH_AI_STEP_ID = 'huntWithAi';

export interface ProductTourStepConfig {
  id: string;
  anchor: string;
  anchorPosition: EuiTourStepProps['anchorPosition'];
  title: string;
  content: string;
}

export const PRODUCT_TOUR_STEPS: readonly ProductTourStepConfig[] = [
  {
    id: 'attention',
    anchor: bySubj(SIGNAL_CARDS_TOUR_ANCHOR_TEST_ID),
    anchorPosition: 'rightCenter',
    title: ATTENTION_STEP_TITLE,
    content: ATTENTION_STEP_CONTENT,
  },
  {
    id: HUNT_WITH_AI_STEP_ID,
    anchor: bySubj(HUNT_WITH_AI_BUTTON_TEST_ID),
    anchorPosition: 'downRight',
    title: AI_STEP_TITLE,
    content: AI_STEP_CONTENT,
  },
  {
    id: 'rows',
    anchor: bySubj(ROWS_MODE_SELECTOR_TEST_ID),
    anchorPosition: 'downCenter',
    title: ROWS_STEP_TITLE,
    content: ROWS_STEP_CONTENT,
  },
];
