/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { ELASTICSEARCH_PLUGIN } from '../../../../../common/constants';
import { docLinks } from '../../../shared/doc_links';
import { ProductCard } from '../product_card';

import { BehavioralAnalyticsProductCard } from './behavioral_analytics_product_card';
import { SearchApplicationsProductCard } from './search_applications_product_card';

export const ElasticsearchProductCard = () => {
  return (
    <ProductCard
      data-test-subj="productCard-elasticsearch"
      description={i18n.translate('xpack.enterpriseSearch.elasticsearch.productCardDescription', {
        defaultMessage:
          'Ideal for bespoke applications, Elasticsearch helps you build highly customizable search and offers many different ingestion methods.',
      })}
      icon="logoElasticsearch"
      name={ELASTICSEARCH_PLUGIN.NAME}
      productId={ELASTICSEARCH_PLUGIN.ID}
      emptyCta
      cta={i18n.translate('xpack.enterpriseSearch.elasticsearchCard.cta', {
        defaultMessage: 'Learn more',
      })}
      url={docLinks.elasticsearchGettingStarted}
      rightPanelItems={[
        <SearchApplicationsProductCard hasBorder={false} hasShadow={false} />,
        <BehavioralAnalyticsProductCard hasBorder={false} hasShadow={false} />,
      ]}
    />
  );
};
