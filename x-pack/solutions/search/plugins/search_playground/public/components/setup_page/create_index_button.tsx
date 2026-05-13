/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export const CreateIndexButton: React.FC = () => {
  const {
    services: { share },
  } = useKibana();

  const searchIndexDetailsUrl = share?.url.locators
    .get('SEARCH_INDEX_MANAGEMENT_LOCATOR_ID')
    ?.useUrl({ page: 'index_list' });

  return searchIndexDetailsUrl ? (
    <EuiButton
      iconType="plusCircle"
      data-test-subj="createIndexButton"
      href={searchIndexDetailsUrl}
    >
      <FormattedMessage
        id="xpack.searchPlayground.createIndexButton"
        defaultMessage="Create an index"
      />
    </EuiButton>
  ) : (
    <EuiCallOut
      announceOnMount
      title={i18n.translate('xpack.searchPlayground.createIndexCallout', {
        defaultMessage: 'You need to create an index first',
      })}
      size="s"
      color="warning"
      data-test-subj="createIndexCallout"
    />
  );
};
