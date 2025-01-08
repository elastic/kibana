/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { AddInferenceFlyoutWrapper } from '../../../../../add_inference_endpoints/add_inference_flyout_wrapper';
import { InferenceEndpointUI } from '../../../../types';

interface ViewActionProps {
  selectedEndpoint: InferenceEndpointUI;
}

export const ViewAction: React.FC<ViewActionProps> = ({ selectedEndpoint }) => {
  const [isViewInferenceFlyoutOpen, setIsViewInferenceFlyoutOpen] = useState<boolean>(false);
  return (
    <>
      <EuiButtonEmpty
        aria-label={i18n.translate('xpack.searchInferenceEndpoints.actions.viewEndpoint', {
          defaultMessage: 'View inference endpoint {selectedEndpointName}',
          values: { selectedEndpointName: selectedEndpoint.endpoint },
        })}
        data-test-subj="viewAction"
        iconType="eye"
        color="text"
        size="s"
        onClick={() => setIsViewInferenceFlyoutOpen(true)}
      >
        {i18n.translate('xpack.searchInferenceEndpoints.actions.viewEndpoint.menuLabel', {
          defaultMessage: 'View endpoint',
        })}
      </EuiButtonEmpty>
      {isViewInferenceFlyoutOpen && (
        <AddInferenceFlyoutWrapper onClose={setIsViewInferenceFlyoutOpen} />
      )}
    </>
  );
};
