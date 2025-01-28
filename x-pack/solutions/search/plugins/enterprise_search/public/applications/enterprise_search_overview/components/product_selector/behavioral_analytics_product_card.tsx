/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { ANALYTICS_PLUGIN } from '../../../../../common/constants';
import baLogo from '../../assets/behavioral_analytics_logo.svg';
import { ProductCard } from '../product_card';

export interface BehavioralAnalyticsProductCard {
  hasBorder: boolean;
  hasShadow: boolean;
}

export const BehavioralAnalyticsProductCard = ({ hasBorder = true, hasShadow = true }) => (
  <ProductCard
    hasBorder={hasBorder}
    hasShadow={hasShadow}
    cta={i18n.translate('xpack.enterpriseSearch.behavioralAnalytics.productCardCTA', {
      defaultMessage: 'Explore Behavioral Analytics',
    })}
    description={i18n.translate('xpack.enterpriseSearch.behavioralAnalytics.description', {
      defaultMessage:
        'Dashboards and tools for visualizing end-user behavior and measuring the performance of your search applications',
    })}
    emptyCta
    icon={baLogo}
    iconSize="l"
    name={ANALYTICS_PLUGIN.NAME}
    productId={ANALYTICS_PLUGIN.ID}
    url={ANALYTICS_PLUGIN.URL}
  />
);
