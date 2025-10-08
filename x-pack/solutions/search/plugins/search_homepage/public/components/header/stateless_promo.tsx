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
      title={i18n.translate('xpack.searchHomepage.header.statelessPromo.9.title', {
        defaultMessage: 'Excluding vectors from source',
      })}
      description={i18n.translate('xpack.searchHomepage.header.statelessPromo.9.description', {
        defaultMessage:
          'Elasticsearch now excludes vectors from source by default, saving space and improving performance while keeping vectors accessible when needed.',
      })}
      cta={
        <HeaderCTALink
          data-telemetry-id="9-exclude-vectors"
          href="https://www.elastic.co/search-labs/blog/elasticsearch-exclude-vectors-from-source"
        >
          {i18n.translate('xpack.searchHomepage.statelessPromo.9.content', {
            defaultMessage: 'View on Elasticsearch Labs',
          })}
        </HeaderCTALink>
      }
    />
  );
};
