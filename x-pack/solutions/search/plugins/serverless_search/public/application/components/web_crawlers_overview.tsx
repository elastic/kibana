/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLink, EuiPageTemplate, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { LEARN_MORE_LABEL } from '../../../common/i18n_string';
import { useKibanaServices } from '../hooks/use_kibana';
import { SelfManagedWebCrawlersEmptyPrompt } from './web_crawlers/self_managed_web_crawlers_empty_prompt';

export const WebCrawlersOverview = () => {
  const { console: consolePlugin } = useKibanaServices();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchConnectorsPage">
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.serverlessSearch.webcrawlers.title', {
          defaultMessage: 'Web Crawlers',
        })}
        data-test-subj="serverlessSearchConnectorsTitle"
        restrictWidth
      >
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.serverlessSearch.webcrawlers.headerContent"
              defaultMessage="Discover extract and index searchable content from websites and knowledge bases {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    data-test-subj="serverlessSearchConnectorsLearnMoreLink"
                    external
                    target="_blank"
                    href={'https://github.com/elastic/crawler'}
                  >
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section restrictWidth color="subdued">
        <SelfManagedWebCrawlersEmptyPrompt />
      </EuiPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
