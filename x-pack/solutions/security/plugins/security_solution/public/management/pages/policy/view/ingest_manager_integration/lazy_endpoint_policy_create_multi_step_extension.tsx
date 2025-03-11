/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { PackagePolicyCreateMultiStepExtensionComponent } from '@kbn/fleet-plugin/public';

export const LazyEndpointPolicyCreateMultiStepExtension =
  lazy<PackagePolicyCreateMultiStepExtensionComponent>(async () => {
    const { EndpointPolicyCreateMultiStepExtension } = await import(
      './endpoint_policy_create_multi_step_extension'
    );
    return {
      default: EndpointPolicyCreateMultiStepExtension,
    };
  });
