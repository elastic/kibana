/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { FleetUiExtensionGetterOptions } from '../common/types';

export const getLazyCloudSecurityPosturePliAuthBlockExtension = ({
  coreStart,
  depsStart,
  services,
}: FleetUiExtensionGetterOptions) =>
  lazy(async () => {
    const [{ withSecurityContext }, { CloudSecurityPosturePliAuthBlockExtension }] =
      await Promise.all([
        import('../common/components/with_security_context/with_security_context'),
        import('./cloud_security_posture_pli_auth_block_extension'),
      ]);
    return {
      default: withSecurityContext({
        coreStart,
        depsStart,
        services,
        WrappedComponent: CloudSecurityPosturePliAuthBlockExtension,
      }),
    };
  });
