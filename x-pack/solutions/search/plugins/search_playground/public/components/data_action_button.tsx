/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import { useWatch } from 'react-hook-form';
import { ChatForm, ChatFormFields } from '../types';
import { SelectIndicesFlyout } from './select_indices_flyout';

export const DataActionButton: React.FC = () => {
  const selectedIndices = useWatch<ChatForm, ChatFormFields.indices>({
    name: ChatFormFields.indices,
  });
  const [showFlyout, setShowFlyout] = useState(false);
  const handleFlyoutClose = () => setShowFlyout(false);
  const handleShowFlyout = () => setShowFlyout(true);

  return (
    <>
      {showFlyout && <SelectIndicesFlyout onClose={handleFlyoutClose} />}
      <EuiButton
        size="s"
        iconType="database"
        onClick={handleShowFlyout}
        disabled={!selectedIndices?.length}
        data-test-subj="dataSourceActionButton"
      >
        <FormattedMessage id="xpack.searchPlayground.dataActionButton" defaultMessage="Data" />
      </EuiButton>
    </>
  );
};
