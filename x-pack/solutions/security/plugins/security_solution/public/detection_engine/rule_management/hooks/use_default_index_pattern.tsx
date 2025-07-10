/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { DEFAULT_INDEX_KEY, DEFAULT_INDEX_PATTERN } from '../../../../common/constants';
import { usePrebuiltRulesCustomizationStatus } from '../logic/prebuilt_rules/use_prebuilt_rules_customization_status';

/**
 * Gets the default index pattern for cases when rule has neither index patterns or data view.
 * First checks the config value. If it's not present falls back to the hardcoded default value.
 */
export function useDefaultIndexPattern(): string[] {
  const { services } = useKibana();
  const { isRulesCustomizationEnabled } = usePrebuiltRulesCustomizationStatus();

  return isRulesCustomizationEnabled
    ? services.settings.client.get(DEFAULT_INDEX_KEY, DEFAULT_INDEX_PATTERN)
    : [];
}
