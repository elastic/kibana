/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { getAssetPolicy } from './utils';
import type { NewPackagePolicyAssetInput } from './types';
import { ASSET_NAMESPACE } from './constants';

export const useEnsureDefaultNamespace = ({
  newPolicy,
  input,
  updatePolicy,
}: {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyAssetInput;
  updatePolicy: (policy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
}) => {
  useEffect(() => {
    if (newPolicy.namespace === ASSET_NAMESPACE) return;

    const policy = { ...getAssetPolicy(newPolicy, input.type), namespace: ASSET_NAMESPACE };
    updatePolicy(policy);
  }, [newPolicy, input, updatePolicy]);
};
