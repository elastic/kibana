/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SEARCH_INDICES, SEARCH_INDICES_CREATE_INDEX } from '@kbn/deeplinks-search/constants';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export const CreateIndexButton: React.FC = () => {
  const {
    services: { application, chrome },
  } = useKibana();

  const createIndexUrl = chrome.navLinks.get(
    `${SEARCH_INDICES}:${SEARCH_INDICES_CREATE_INDEX}`
  )?.url;

  const handleCreateIndexClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();

      if (!createIndexUrl) {
        return;
      }

      application?.navigateToUrl(createIndexUrl);
    },
    [application, createIndexUrl]
  );

  return createIndexUrl ? (
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiButton
      color="primary"
      iconType="plusInCircle"
      fill
      data-test-subj="createIndexButton"
      href={createIndexUrl}
      onClick={handleCreateIndexClick}
    >
      <FormattedMessage
        id="xpack.searchPlayground.createIndexButton"
        defaultMessage="Create an index"
      />
    </EuiButton>
  ) : (
    <EuiCallOut
      title={i18n.translate('xpack.searchPlayground.createIndexCallout', {
        defaultMessage: 'You need to create an index first',
      })}
      size="s"
      color="warning"
      data-test-subj="createIndexCallout"
    />
  );
};
