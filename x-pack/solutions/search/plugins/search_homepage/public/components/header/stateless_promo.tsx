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
import { useKibana } from '../../hooks/use_kibana';
import { HeaderCTAButton } from './cta_button';

export const StatelessHeaderPromo = () => {
  const {
    services: { application },
  } = useKibana();

  const ctaButtonLabel = i18n.translate('xpack.searchHomepage.statelessPromo12.content.ctaButton', {
    defaultMessage: 'Start Building',
  });
  return (
    <HeaderPromo
      title={i18n.translate('xpack.searchHomepage.header.statelessPromo12.title', {
        defaultMessage: 'Get started building AI Agents and chatting with your data',
      })}
      description={i18n.translate('xpack.searchHomepage.header.statelessPromo12.description', {
        defaultMessage:
          'Start building AI agents. Try Agent Builder to chat with your data using powerful native tools, or create your own agents and tools with hybrid search and ES|QL.',
      })}
      actions={[
        <HeaderCTAButton
          key="12-agent-builder-button"
          data-telemetry-id="12-agent-builder-button"
          handleOnClick={() => {
            application.navigateToApp('agent_builder');
          }}
          ariaLabel={ctaButtonLabel}
        >
          {ctaButtonLabel}
        </HeaderCTAButton>,
        <HeaderCTALink
          key="12-agent-builder-blog"
          // "search-promo-homepage-" is prepended to the telemetry id in HeaderCTALink
          data-telemetry-id="12-agent-builder-blog"
          href="https://www.elastic.co/search-labs/blog/ai-agentic-workflows-elastic-ai-agent-builder"
        >
          {i18n.translate('xpack.searchHomepage.statelessPromo12.content.ctaLink', {
            defaultMessage: 'Check out the docs',
          })}
        </HeaderCTALink>,
      ]}
    />
  );
};
