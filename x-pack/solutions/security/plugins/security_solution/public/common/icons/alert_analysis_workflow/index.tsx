/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { AiIcon } from '@kbn/shared-ux-ai-components';

export const IconAlertAnalysisWorkflow = React.memo<Omit<EuiIconProps, 'type'>>((props) => (
  <AiIcon iconType="sparkles" {...props} />
));
IconAlertAnalysisWorkflow.displayName = 'IconAlertAnalysisWorkflow';
