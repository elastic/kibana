/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { findEndpointArtifactsStepCommonDefinition } from '../../../../common/workflows/step_types/endpoint/artifacts';
import { searchIntegrationKnowledgeStepCommonDefinition } from '../../../../common/workflows/step_types/endpoint/integration_knowledge/search_integration_knowledge_step_common';
import {
  getEndpointHostDiagnosticsStepCommonDefinition,
  getEndpointInventoryCountsStepCommonDefinition,
  resolveEndpointHostsStepCommonDefinition,
} from '../../../../common/workflows/step_types/endpoint/hosts';
import { getEndpointPackageStatusStepCommonDefinition } from '../../../../common/workflows/step_types/endpoint/package';
import { finalizeTroubleshootingDiagnosisStepCommonDefinition } from '../../../../common/workflows/step_types/endpoint/configuration_troubleshooting';
import {
  getEndpointPolicyFieldReferenceStepCommonDefinition,
  listEndpointPoliciesStepCommonDefinition,
  getEndpointPolicyStepCommonDefinition,
  getEndpointPolicyBaselineStepCommonDefinition,
  compareEndpointPoliciesStepCommonDefinition,
  getEndpointPolicyRolloutStatusStepCommonDefinition,
  assessEndpointPolicyChangeStepCommonDefinition,
} from '../../../../common/workflows/step_types/endpoint/policies/steps';

export const findEndpointArtifactsPublicStepDefinition = createPublicStepDefinition({
  ...findEndpointArtifactsStepCommonDefinition,
});

export const searchIntegrationKnowledgePublicStepDefinition = createPublicStepDefinition({
  ...searchIntegrationKnowledgeStepCommonDefinition,
});

export const resolveEndpointHostsPublicStepDefinition = createPublicStepDefinition({
  ...resolveEndpointHostsStepCommonDefinition,
});

export const getEndpointHostDiagnosticsPublicStepDefinition = createPublicStepDefinition({
  ...getEndpointHostDiagnosticsStepCommonDefinition,
});

export const getEndpointPackageStatusPublicStepDefinition = createPublicStepDefinition({
  ...getEndpointPackageStatusStepCommonDefinition,
});

export const getEndpointInventoryCountsPublicStepDefinition = createPublicStepDefinition({
  ...getEndpointInventoryCountsStepCommonDefinition,
});

export const finalizeTroubleshootingDiagnosisPublicStepDefinition = createPublicStepDefinition({
  ...finalizeTroubleshootingDiagnosisStepCommonDefinition,
});

export const getEndpointPolicyFieldReferencePublicStepDefinition = createPublicStepDefinition({
  ...getEndpointPolicyFieldReferenceStepCommonDefinition,
});
export const listEndpointPoliciesPublicStepDefinition = createPublicStepDefinition({
  ...listEndpointPoliciesStepCommonDefinition,
});
export const getEndpointPolicyPublicStepDefinition = createPublicStepDefinition({
  ...getEndpointPolicyStepCommonDefinition,
});
export const getEndpointPolicyBaselinePublicStepDefinition = createPublicStepDefinition({
  ...getEndpointPolicyBaselineStepCommonDefinition,
});
export const compareEndpointPoliciesPublicStepDefinition = createPublicStepDefinition({
  ...compareEndpointPoliciesStepCommonDefinition,
});
export const getEndpointPolicyRolloutStatusPublicStepDefinition = createPublicStepDefinition({
  ...getEndpointPolicyRolloutStatusStepCommonDefinition,
});
export const assessEndpointPolicyChangePublicStepDefinition = createPublicStepDefinition({
  ...assessEndpointPolicyChangeStepCommonDefinition,
});
