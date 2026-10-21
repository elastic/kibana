/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIllustration } from '@elastic/eui';
import { userPresentationLightBulb } from '@elastic/eui-illustrations';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import {
  ADVANCED_ENTITY_ANALYTICS_DOCS_URL,
  PRODUCT_TOUR_BANNER_TEST_ID,
  PRODUCT_TOUR_DISMISS_TEST_ID,
  PRODUCT_TOUR_DOCS_TEST_ID,
  PRODUCT_TOUR_START_TEST_ID,
} from './constants';
import {
  BANNER_DISMISS,
  BANNER_START_TOUR,
  BANNER_TEXT,
  BANNER_TITLE,
  BANNER_VIEW_DOCS,
} from './translations';

export interface ProductTourBannerProps {
  onStartTour: () => void;
  onDismiss: () => void;
}

/** First-visit banner that starts the Entity Analytics product tour. */
export const ProductTourBanner: React.FC<ProductTourBannerProps> = ({ onStartTour, onDismiss }) => (
  <AnnouncementBanner
    data-test-subj={PRODUCT_TOUR_BANNER_TEST_ID}
    title={BANNER_TITLE}
    text={BANNER_TEXT}
    media={<EuiIllustration type={userPresentationLightBulb} alt="" />}
    actionProps={{
      primary: {
        children: BANNER_START_TOUR,
        onClick: onStartTour,
        'data-test-subj': PRODUCT_TOUR_START_TEST_ID,
      },
      secondary: {
        children: BANNER_VIEW_DOCS,
        href: ADVANCED_ENTITY_ANALYTICS_DOCS_URL,
        target: '_blank',
        rel: 'noopener noreferrer',
        iconType: 'external',
        iconSide: 'right',
        'data-test-subj': PRODUCT_TOUR_DOCS_TEST_ID,
      },
    }}
    onDismiss={onDismiss}
    dismissButtonProps={{
      'aria-label': BANNER_DISMISS,
      'data-test-subj': PRODUCT_TOUR_DISMISS_TEST_ID,
    }}
  />
);
