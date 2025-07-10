/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLicense } from '../../../common/hooks/use_license';
import {
  isArtifactByPolicy,
  isArtifactGlobal,
} from '../../../../common/endpoint/service/artifacts';
import type { ArtifactFormComponentProps } from '../../components/artifact_list_page';

/**
 * Calculates if by-policy assignments can be made to an artifact.
 *
 * Per-Policy assignment is a Platinum+ licensed feature only, but the component can
 * be displayed in down-grade conditions: meaning - when user downgrades the license,
 * we will still allow the component to be displayed in the UI so that user has the
 * ability to set the artifact to `global`.
 */
export const useCanAssignArtifactPerPolicy = (
  item: ArtifactFormComponentProps['item'],
  mode: ArtifactFormComponentProps['mode'],
  hasItemBeenUpdated: boolean
): boolean => {
  const isPlatinumPlus = useLicense().isPlatinumPlus();
  const isGlobal = useMemo(() => isArtifactGlobal(item), [item]);
  const [wasByPolicy, setWasByPolicy] = useState(isArtifactByPolicy(item));

  useEffect(() => {
    if (!hasItemBeenUpdated && item.tags) {
      setWasByPolicy(!isArtifactGlobal({ tags: item.tags }));
    }
  }, [item.tags, hasItemBeenUpdated]);

  return useMemo(() => {
    if (isPlatinumPlus) {
      return true;
    }

    if (mode !== 'edit') {
      return false;
    }

    if (!isGlobal) {
      return true;
    }

    return wasByPolicy && hasItemBeenUpdated;
  }, [mode, isGlobal, hasItemBeenUpdated, isPlatinumPlus, wasByPolicy]);
};
