/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { ChatForm, ChatFormFields } from '../../types';
import { SelectIndicesFlyout } from '../select_indices_flyout';

export const AddDataSources: React.FC = () => {
  const [showFlyout, setShowFlyout] = useState(false);
  const { getValues } = useFormContext<ChatForm>();
  const hasSelectedIndices: boolean = !!getValues(ChatFormFields.indices)?.length;
  const handleFlyoutClose = () => {
    setShowFlyout(false);
  };

  return (
    <>
      {showFlyout && <SelectIndicesFlyout onClose={handleFlyoutClose} />}
      {hasSelectedIndices ? (
        <EuiButtonEmpty
          iconType="check"
          color="success"
          onClick={() => setShowFlyout(true)}
          data-test-subj="dataSourcesSuccessButton"
        >
          <FormattedMessage
            id="xpack.searchPlayground.setupPage.addedDataSourcesLabel"
            defaultMessage="Data sources added"
          />
        </EuiButtonEmpty>
      ) : (
        <EuiButton
          fill
          iconType="plusInCircle"
          onClick={() => setShowFlyout(true)}
          data-test-subj="addDataSourcesButton"
        >
          <FormattedMessage
            id="xpack.searchPlayground.setupPage.addDataSourcesLabel"
            defaultMessage="Add data sources"
          />
        </EuiButton>
      )}
    </>
  );
};
