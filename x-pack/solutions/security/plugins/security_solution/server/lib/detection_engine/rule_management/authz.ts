/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  RULES_UI_READ,
  RULES_UI_EDIT,
  EXCEPTIONS_UI_READ,
  EXCEPTIONS_UI_EDIT,
  ENABLE_DISABLE_RULES_UI,
  CUSTOM_HIGHLIGHTED_FIELDS_UI_EDIT,
  INVESTIGATION_GUIDE_UI_EDIT,
} from '@kbn/security-solution-features/constants';
import type { DetectionRulesAuthz } from '../../../../common/detection_engine/rule_management/authz';
import { RULES_FEATURE_ID } from '../../../../common';

interface CalculateRulesAuthzProps {
  coreStart: CoreStart;
  request: KibanaRequest;
}

export const calculateRulesAuthz = async ({
  coreStart,
  request,
}: CalculateRulesAuthzProps): Promise<DetectionRulesAuthz> => {
  const { [RULES_FEATURE_ID]: capabilities } = await coreStart.capabilities.resolveCapabilities(
    request,
    {
      capabilityPath: `${RULES_FEATURE_ID}.*`,
    }
  );

  return {
    canReadRules: capabilities[RULES_UI_READ] as boolean,
    canEditRules: capabilities[RULES_UI_EDIT] as boolean,
    canReadExceptions: capabilities[EXCEPTIONS_UI_READ] as boolean,
    canEditExceptions: capabilities[EXCEPTIONS_UI_EDIT] as boolean,
    canEnableDisableRules: capabilities[ENABLE_DISABLE_RULES_UI] as boolean,
    canEditCustomHighlightedFields: capabilities[CUSTOM_HIGHLIGHTED_FIELDS_UI_EDIT] as boolean,
    canEditInvestigationGuides: capabilities[INVESTIGATION_GUIDE_UI_EDIT] as boolean,
  };
};
