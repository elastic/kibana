/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AnyArtifact, ArtifactInfo } from '../types';
import { mapToArtifactInfo } from '../utils';
import type { MaybeImmutable } from '../../../../../common/endpoint/types';

/**
 * Takes in any artifact and return back a new data structure used internally with by the card's components
 *
 * @param item
 */
export const useNormalizedArtifact = (item: MaybeImmutable<AnyArtifact>): ArtifactInfo => {
  return useMemo(() => {
    return mapToArtifactInfo(item);
  }, [item]);
};
