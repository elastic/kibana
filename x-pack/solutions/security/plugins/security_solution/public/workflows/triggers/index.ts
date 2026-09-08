/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  PublicTriggerDefinition,
  WorkflowsExtensionsPublicPluginSetup,
} from '@kbn/workflows-extensions/public';

const securityWorkflowIcon: React.ComponentType = React.lazy(() =>
  import('@elastic/eui/es/components/icon/assets/app_security').then(({ icon }) => ({
    default: icon,
  }))
);

export const registerSecurityWorkflowTriggers = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (m): PublicTriggerDefinition => ({
        ...m.alertStatusChangedTriggerDef,
        icon: securityWorkflowIcon,
      })
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (m): PublicTriggerDefinition => ({
        ...m.alertTagsChangedTriggerDef,
        icon: securityWorkflowIcon,
      })
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (m): PublicTriggerDefinition => ({
        ...m.alertAssigneesChangedTriggerDef,
        icon: securityWorkflowIcon,
      })
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (m): PublicTriggerDefinition => ({
        ...m.attackStatusChangedTriggerDef,
        icon: securityWorkflowIcon,
      })
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (m): PublicTriggerDefinition => ({
        ...m.attackTagsChangedTriggerDef,
        icon: securityWorkflowIcon,
      })
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (m): PublicTriggerDefinition => ({
        ...m.attackAssigneesChangedTriggerDef,
        icon: securityWorkflowIcon,
      })
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (m): PublicTriggerDefinition => ({ ...m.noteCreatedTriggerDef, icon: securityWorkflowIcon })
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (m): PublicTriggerDefinition => ({ ...m.noteUpdatedTriggerDef, icon: securityWorkflowIcon })
    )
  );
};
