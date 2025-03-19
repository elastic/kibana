/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { IntegrationType } from '@kbn/wci-common';

export interface IntegrationComponentDescriptor {
  getConfigurationForm: () => React.ComponentType<IntegrationConfigurationFormProps>;
  getTool: () => React.ComponentType<IntegrationToolComponentProps>;
  getType: () => IntegrationType;
}

export interface IntegrationToolComponentProps {
  toolCall: any; // TODO: fix this
  complete: boolean;
}

export interface IntegrationConfigurationFormProps {
  // TODO: fix this
  // shouldn't need this and use the useFormContext vs passing down as prop
  form: UseFormReturn<any>;
}
