/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FlyoutError } from '../../shared/components/flyout_error';
import type { Indicator } from '../../../../common/threat_intelligence/types/indicator';
import { JsonTab as SharedJsonTab } from '../../../flyout/shared/components/json_tab';

export const FLYOUT_JSON_TEST_ID = 'indicators-flyout';

export interface JsonTabProps {
  /**
   * The indicator document
   */
  indicator: Indicator;
}

/**
 * Displays all the properties and values of an {@link Indicator} in json view,
 * using the {@link EuiCodeBlock} from the @elastic/eui library.
 */
export const JsonTab = memo(({ indicator }: JsonTabProps) => {
  return Object.keys(indicator.fields).length === 0 ? (
    <FlyoutError />
  ) : (
    <SharedJsonTab
      value={indicator as unknown as Record<string, unknown>}
      showFooterOffset={false}
      data-test-subj={FLYOUT_JSON_TEST_ID}
    />
  );
});

JsonTab.displayName = 'JsonTab';
