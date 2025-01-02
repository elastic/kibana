/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiPageTemplate } from '@elastic/eui';

import { useQueryInferenceEndpoints } from '../hooks/use_inference_endpoints';
import { TabularPage } from './all_inference_endpoints/tabular_page';
import { InferenceEndpointsHeader } from './inference_endpoints_header';
import { AddInferenceFlyoutWrapper } from './add_inference_endpoints/add_inference_flyout_wrapper';

export const InferenceEndpoints: React.FC = () => {
  const { data } = useQueryInferenceEndpoints();
  const [isAddInferenceFlyoutOpen, setIsAddInferenceFlyoutOpen] = useState<boolean>(false);

  const inferenceEndpoints = data || [];

  return (
    <>
      <InferenceEndpointsHeader setIsAddInferenceFlyoutOpen={setIsAddInferenceFlyoutOpen} />
      <EuiPageTemplate.Section className="eui-yScroll" data-test-subj="inferenceManagementPage">
        <TabularPage inferenceEndpoints={inferenceEndpoints} />
      </EuiPageTemplate.Section>
      {isAddInferenceFlyoutOpen && (
        <AddInferenceFlyoutWrapper onClose={setIsAddInferenceFlyoutOpen} />
      )}
    </>
  );
};
