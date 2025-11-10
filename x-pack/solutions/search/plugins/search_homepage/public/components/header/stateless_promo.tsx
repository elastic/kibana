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
        defaultMessage: 'Building AI Agentic workflows with Elasticsearch',
      })}
      description={i18n.translate('xpack.searchHomepage.header.statelessPromo.description', {
        defaultMessage:
          'Learn about Agent Builder, a new AI layer in Elasticsearch that provides a framework for building AI agentic workflows, using hybrid search to provide agents with the context they need to reason and act.',
      })}
      cta={
        <HeaderCTALink
          // "search-promo-homepage-" is prepended to the telemetry id in HeaderCTALink
          data-telemetry-id="12-agent-builder-blog"
          href="https://www.elastic.co/search-labs/blog/ai-agentic-workflows-elastic-ai-agent-builder"
        >
          {i18n.translate('xpack.searchHomepage.statelessPromo.content', {
            defaultMessage: 'Read the blog',
          })}
        </HeaderCTALink>
      }
    />
  );
};
