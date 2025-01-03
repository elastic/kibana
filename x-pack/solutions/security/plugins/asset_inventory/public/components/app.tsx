/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';

const AssetInventoryApp = () => {
  return (
    <I18nProvider>
      <>
        <EuiPageTemplate restrictWidth="1000px">
          <EuiPageTemplate.Header>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage id="assetInventory.allAssets" defaultMessage="All Assets" />
              </h1>
            </EuiTitle>
          </EuiPageTemplate.Header>
          <EuiPageTemplate.Section />
        </EuiPageTemplate>
      </>
    </I18nProvider>
  );
};

// we need to use default exports to import it via React.lazy
export default AssetInventoryApp; // eslint-disable-line import/no-default-export
