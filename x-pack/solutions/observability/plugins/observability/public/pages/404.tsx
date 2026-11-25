/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { usePluginContext } from '../hooks/use_plugin_context';

function PageNotFound() {
  const { ObservabilityPageTemplate } = usePluginContext();

  return (
    <ObservabilityPageTemplate data-test-subj="pageNotFound">
      <KbnWarningCallout
        title={
          <FormattedMessage
            id="xpack.observability.notFoundPage.title"
            defaultMessage="Page Not Found"
          />
        }
        data-test-subj={'observabilityPageNotFoundBanner'}
        text={
          <p data-test-subj={'observabilityPageNotFoundBannerText'}>
            <FormattedMessage
              id="xpack.observability.notFoundPage.bannerText"
              defaultMessage="The Observability application doesn't recognize this route"
            />
          </p>
        }
      />
    </ObservabilityPageTemplate>
  );
}

// eslint-disable-next-line import/no-default-export
export default PageNotFound;
