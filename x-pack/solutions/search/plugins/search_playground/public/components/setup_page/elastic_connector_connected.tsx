/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ElasticLLMCostTour } from '../elastic_llm_cost_tour';

export const ElasticManagedConnector = ({ name }: { name: string }) => {
  return (
    <ElasticLLMCostTour connectorName={name}>
      <EuiText color="success">
        <FormattedMessage
          id="xpack.searchPlayground.setupPage.elasticManagedLlmConnectedButtonLabel"
          defaultMessage="{connectorName} connected"
          values={{
            connectorName: name || 'Elastic Managed LLM',
          }}
        />
      </EuiText>
    </ElasticLLMCostTour>
  );
};
