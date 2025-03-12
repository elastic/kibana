/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLicense } from '../../../common/hooks/use_license';
import { isArtifactGlobal } from '../../../../common/endpoint/service/artifacts';
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
  hasFormChanged: boolean
): boolean => {
  const isPlatinumPlus = useLicense().isPlatinumPlus();
  const isGlobal = useMemo(() => isArtifactGlobal(item), [item]);
  const [wasByPolicy, setWasByPolicy] = useState(!isArtifactGlobal(item));

  useEffect(() => {
    if (!hasFormChanged && item.tags) {
      setWasByPolicy(!isArtifactGlobal({ tags: item.tags }));
    }
  }, [item.tags, hasFormChanged]);

  return useMemo(() => {
    return (
      isPlatinumPlus ||
      (mode === 'edit' && (!isGlobal || (wasByPolicy && isGlobal && hasFormChanged)))
    );
  }, [mode, isGlobal, hasFormChanged, isPlatinumPlus, wasByPolicy]);
};
