/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useContext, type PropsWithChildren } from 'react';
import type { MaybeImmutable } from '../../../../../common/endpoint/types';
import type { AnyArtifact } from '..';

const CardArtifactContext = React.createContext<MaybeImmutable<AnyArtifact> | undefined>(undefined);

export interface CardArtifactProviderProps extends PropsWithChildren {
  item: MaybeImmutable<AnyArtifact>;
}

/**
 * Stores and provides the Artifact item that is being rendered
 */
export const CardArtifactProvider = memo<CardArtifactProviderProps>(({ item, children }) => {
  return <CardArtifactContext.Provider value={item}>{children}</CardArtifactContext.Provider>;
});
CardArtifactProvider.displayName = 'CardArtifactProvider';

/**
 * Retrieve the artifact item (`ExceptionListItemSchema`) that is currently being rendered
 */
export const useCardArtifact = (): MaybeImmutable<AnyArtifact> => {
  const artifact = useContext(CardArtifactContext);

  if (!artifact) {
    throw new Error('Card has not been initialized correctly - missing Artifact item');
  }

  return artifact;
};
