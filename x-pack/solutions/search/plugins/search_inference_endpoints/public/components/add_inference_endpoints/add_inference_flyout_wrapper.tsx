/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import InferenceFlyoutWrapper from '@kbn/inference-endpoint-ui-common';
import { useKibana } from '../../hooks/use_kibana';

interface AddInferenceFlyoutWrapperProps {
  onFlyoutClose: () => void;
  reloadFn: () => void;
}

export const AddInferenceFlyoutWrapper: React.FC<AddInferenceFlyoutWrapperProps> = ({
  onFlyoutClose,
  reloadFn,
}) => {
  const {
    services: {
      http,
      notifications: { toasts },
    },
  } = useKibana();
  const onSubmitSuccess = useCallback(() => {
    reloadFn();
  }, [reloadFn]);

  return (
    <InferenceFlyoutWrapper
      onFlyoutClose={onFlyoutClose}
      http={http}
      toasts={toasts}
      onSubmitSuccess={onSubmitSuccess}
    />
  );
};
