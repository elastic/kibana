/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton } from '@elastic/eui';

export interface HeaderCTAButtonProps {
  handleOnClick: () => void;
  'data-telemetry-id': string;
  'data-test-subj'?: string;
  children: React.ReactNode | React.ReactNode[];
  ariaLabel: string;
}

export const HeaderCTAButton = (props: HeaderCTAButtonProps) => (
  <EuiButton
    // keep "search-promo-homepage" as the prefix for every tracking ID so we can filter on that prefix for the total homepage promo clicks overall
    data-telemetry-id={`search-promo-homepage-${props['data-telemetry-id']}`}
    data-test-subj={props['data-test-subj'] || 'searchHomepageHeaderButton'}
    onClick={props.handleOnClick}
    aria-label={props.ariaLabel}
  >
    {props.children}
  </EuiButton>
);
