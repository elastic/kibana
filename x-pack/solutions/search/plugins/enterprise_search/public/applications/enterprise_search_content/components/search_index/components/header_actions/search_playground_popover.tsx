/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { useValues } from 'kea';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../shared/kibana';

export interface SearchPlaygroundPopoverProps {
  indexName: string;
  ingestionMethod: string;
}

export const SearchPlaygroundPopover: React.FC<SearchPlaygroundPopoverProps> = ({
  indexName,
  ingestionMethod,
}) => {
  const { share } = useValues(KibanaLogic);
  const onStartPlaygroundClick = useCallback(() => {
    if (!share) return;
    const playgroundLocator = share.url.locators.get('PLAYGROUND_LOCATOR_ID');
    if (playgroundLocator) {
      playgroundLocator.navigate({ 'default-index': indexName });
    }
  }, [indexName, share]);

  return (
    <EuiButton
      data-test-subj="enterpriseSearchSearchPlaygroundPopoverViewInPlaygroundButton"
      data-telemetry-id={`entSearchContent-${ingestionMethod}-header-viewPlayground`}
      iconType="eye"
      onClick={onStartPlaygroundClick}
    >
      {i18n.translate('xpack.enterpriseSearch.content.index.viewPlayground', {
        defaultMessage: 'View in Playground',
      })}
    </EuiButton>
  );
};
