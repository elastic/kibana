/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useAddIntegrationsUrl } from '../../../../common/hooks/use_add_integrations_url';
import { ADD_INTEGRATION } from './translations';

/**
 *
 */
export const AddIntegration = memo(() => {
  const { onClick: addIntegration } = useAddIntegrationsUrl();

  return (
    <EuiButtonEmpty onClick={addIntegration} iconType="plusInCircle">
      {ADD_INTEGRATION}
    </EuiButtonEmpty>
  );
});

AddIntegration.displayName = 'AddIntegration';
