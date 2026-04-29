/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../hooks/use_kibana';

export const PlaygroundDeprecationNotice = () => {
  const { share } = useKibana().services;
  const navigateToAgentBuilder = useCallback(async () => {
    const agentBuilderLocator = share.url.locators.get('AGENT_BUILDER_LOCATOR_ID');
    await agentBuilderLocator?.navigate({});
  }, [share]);
  return (
    <EuiCallOut
      iconType="info"
      title={i18n.translate('xpack.searchPlayground.playgroundDeprecationNotice.calloutTitle', {
        defaultMessage: 'Deprecation Notice',
      })}
      aria-label={i18n.translate(
        'xpack.searchPlayground.playgroundDeprecationNotice.arialabel.calloutTitle',
        {
          defaultMessage: 'Playground deprecation Notice',
        }
      )}
      color="warning"
      heading="h4"
      data-test-subj="playgroundDeprecationNotice"
      announceOnMount
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.searchPlayground.playgroundDeprecationNotice.description"
            defaultMessage="Playground will be deprecated in the next major release. {agent_builder_title} is now the home for RAG development—taking you from experimentation to production-ready AI agents, with a built-in chat user experience, tools for query generation, and LLM orchestration. No more handoff friction between prototyping and deployment. Start building production-ready AI agents today—with your indexes and LLMs in one place. Explore {agent_builder_redirect_link}"
            values={{
              agent_builder_title: (
                <strong>
                  {i18n.translate(
                    'xpack.searchPlayground.playgroundDeprecationNotice.agentBuilderLabel',
                    { defaultMessage: 'Agent builder' }
                  )}
                </strong>
              ),

              agent_builder_redirect_link: (
                <EuiLink
                  data-test-subj="searchPlaygroundPlaygroundDeprecationNoticeAgentBuilderLink"
                  onClick={navigateToAgentBuilder}
                  aria-label={i18n.translate(
                    'xpack.searchPlayground.playgroundDeprecationNotice.arialabel.agentBuilderRedirectLabel',
                    { defaultMessage: 'Agent builder' }
                  )}
                >
                  {i18n.translate(
                    'xpack.searchPlayground.playgroundDeprecationNotice.agentBuilderLink',
                    {
                      defaultMessage: 'Agent Builder',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </EuiCallOut>
  );
};
