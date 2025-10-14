/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { HeaderPromo } from './promo';
import { HeaderCTALink } from './cta_link';

export const StatelessHeaderPromo = () => {
  return (
    <HeaderPromo
      title={i18n.translate('xpack.searchHomepage.header.statelessPromo.title', {
        defaultMessage: 'GPUs go brrr! GPU-accelerated inference for ELSER',
      })}
      description={i18n.translate('xpack.searchHomepage.header.statelessPromo.description', {
        defaultMessage:
          'We are thrilled to launch ELSER on ElS -- get state-of-the-art semantic search relevance without having to manage your own machine learning nodes.',
      })}
      cta={
        <HeaderCTALink
          // "search-promo-homepage-" is prepended to the telemetry id in HeaderCTALink
          data-telemetry-id="11-elser-on-eis"
          href="https://www.elastic.co/docs/explore-analyze/elastic-inference/eis#elser-on-eis"
        >
          {i18n.translate('xpack.searchHomepage.statelessPromo.content', {
            defaultMessage: 'View docs',
          })}
        </HeaderCTALink>
      }
    />
  );
};
