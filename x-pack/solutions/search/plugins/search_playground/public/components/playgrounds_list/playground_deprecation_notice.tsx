/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { docLinks } from '../../../common/doc_links';

export const PlaygroundDeprecationNotice = () => {
  return (
    <EuiCallOut
      iconType="info"
      title={i18n.translate('xpack.searchPlayground.playgroundDeprecationNotice.title', {
        defaultMessage: 'Deprecation Notice',
      })}
      color="warning"
      heading="h4"
      data-test-subj="playgroundDeprecationNotice"
      announceOnMount
    >
      <FormattedMessage
        id="xpack.searchPlayground.playgroundDeprecationNotice.description"
        defaultMessage="Playground will be deprecated in the next major release and is replaced by {agent_builder_docs}, our new home for RAG development. While Playground helped you test queries, Agent Builder allows you to transform those insights into production-ready AI agents with seamless index integration and LLM orchestration."
        values={{
          agent_builder_docs: (
            <EuiLink
              data-test-subj="searchPlaygroundDeprecationNoticeAgentBuilderLink"
              href={docLinks.agentBuilderLink}
              target="_blank"
            >
              {i18n.translate(
                'xpack.searchPlayground.playgroundDeprecationNotice.agentBuilderLinkLabel',
                { defaultMessage: 'Agent builder' }
              )}
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
