/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiCopy,
  EuiButtonIcon,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export const ConnectToElasticsearch = () => {
  const localhost = 'http://localhost:9200/';

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiTitle size="m">
            <span>
              {i18n.translate('xpack.searchHomepage.connectToElasticsearch.title', {
                defaultMessage: 'Connect to Elasticsearch',
              })}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            {i18n.translate('xpack.searchHomepage.connectToElasticsearch.description', {
              defaultMessage:
                'Set up your connection to Elasticsearch to start searching and analyzing your data.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <span>
                  {i18n.translate(
                    'xpack.searchHomepage.connectToElasticsearch.elasticSearchEndpointLabel',
                    {
                      defaultMessage: 'Elasticsearch endpoint',
                    }
                  )}
                </span>
              </EuiTitle>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={localhost}>
                    {(copy) => (
                      <EuiButtonIcon
                        onClick={copy}
                        iconType="copyClipboard"
                        display="base"
                        size="m"
                      />
                    )}
                  </EuiCopy>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFieldText value={localhost} readOnly />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
    </>
  );
};
