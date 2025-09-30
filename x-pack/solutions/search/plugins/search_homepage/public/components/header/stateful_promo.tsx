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

export const StatefulHeaderPromo = () => {
  return (
    <HeaderPromo
      title={i18n.translate('xpack.searchHomepage.header.statefulPromo.title', {
        defaultMessage: 'Build your first search solution',
      })}
      description={i18n.translate('xpack.searchHomepage.header.statefulPromo.description', {
        defaultMessage:
          'Learn the fundamentals of creating a complete search experience with this hands-on tutorial.',
      })}
      cta={
        <HeaderCTALink
          data-test-subj="searchHomepageSearchHomepageHeaderCTA"
          data-telemetry-id="8-search-tutorial"
          href="https://www.elastic.co/search-labs/tutorials/search-tutorial/welcome"
        >
          {i18n.translate('xpack.searchHomepage.statefulPromo.content', {
            defaultMessage: 'Start the tutorial',
          })}
        </HeaderCTALink>
      }
    />
  );
};
