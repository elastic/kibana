/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RecursivePartial } from '@elastic/eui';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import {
  areResourcesSetup,
  createDefaultSetupState,
  ProfilingSetupOptions,
  SetupState,
} from './setup';

export interface ProfilingCloudSetupOptions extends ProfilingSetupOptions {
  packagePolicyClient: PackagePolicyClient;
  isCloudEnabled: boolean;
}

export interface CloudSetupStateType {
  type: 'cloud';
  setupState: CloudSetupState;
}

export interface CloudSetupState extends SetupState {
  cloud: {
    available: boolean;
    required: boolean;
  };
  policies: {
    collector: {
      installed: boolean;
    };
    symbolizer: {
      installed: boolean;
    };
    apm: {
      profilingEnabled: boolean;
    };
  };
}

export type PartialCloudSetupState = RecursivePartial<CloudSetupState>;

export function createDefaultCloudSetupState(): CloudSetupState {
  const defaultSetupState = createDefaultSetupState();
  return {
    cloud: {
      available: false,
      required: true,
    },
    policies: {
      collector: {
        installed: false,
      },
      symbolizer: {
        installed: false,
      },
      apm: {
        profilingEnabled: false,
      },
    },
    ...defaultSetupState,
  };
}

export function areCloudResourcesSetup(state: CloudSetupState): boolean {
  return (
    areResourcesSetup(state) &&
    state.policies.collector.installed &&
    state.policies.symbolizer.installed &&
    !state.policies.apm.profilingEnabled
  );
}
