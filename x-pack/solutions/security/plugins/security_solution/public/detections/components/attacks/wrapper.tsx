/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { AttacksPageContent } from './content';

export const DATA_VIEW_ERROR_TEST_ID = 'attacks-page-data-view-error';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.attacksPage.dataViewError', {
  defaultMessage: 'Unable to retrieve the data view',
});

export const Wrapper = memo(() => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  return (
    <>
      {!newDataViewPickerEnabled ? (
        <EuiEmptyPrompt
          color="danger"
          data-test-subj={DATA_VIEW_ERROR_TEST_ID}
          iconType="error"
          title={<h2>{DATAVIEW_ERROR}</h2>}
        />
      ) : (
        <AttacksPageContent />
      )}
    </>
  );
});

Wrapper.displayName = 'Wrapper';
