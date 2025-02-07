/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
interface ConnectToApiButtonProps {
  onClick: () => void;
}

export const ConnectToApiButton: React.FC<ConnectToApiButtonProps> = ({ onClick }) => {
  return (
    <EuiButton
      data-test-subj="searchSynonymsSynonymsSetDetailConnectToApiButton"
      color="text"
      iconType="endpoint"
      onClick={onClick}
    >
      {i18n.translate('xpack.searchSynonyms.synonymsSetDetail.connectToApiButton', {
        defaultMessage: 'Connect to API',
      })}
    </EuiButton>
  );
};
