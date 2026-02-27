/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useMetadataStateContext } from './use_metadata_state';

export const useIntegrationCheck = ({ dependsOn }: { dependsOn: string }) => {
  const { metadata } = useMetadataStateContext();

  const hasIntegration = useMemo(
    () => (metadata?.features ?? []).some((f) => f.name.startsWith(dependsOn)),
    [metadata?.features, dependsOn]
  );

  return hasIntegration;
};
