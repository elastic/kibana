/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantSpaceIdProvider as ElasticAssistantSpaceIdProvider } from '@kbn/elastic-assistant';
import React from 'react';
import { useSpaceId } from '../../hooks/space_id/use_space_id';

export const AssistantSpaceIdProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const spaceId = useSpaceId();

  if (!spaceId) {
    return null;
  }

  return (
    <ElasticAssistantSpaceIdProvider spaceId={spaceId}>{children}</ElasticAssistantSpaceIdProvider>
  );
};
