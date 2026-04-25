/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink } from '@elastic/eui';

export interface HeaderCTALinkProps {
  href: string;
  'data-telemetry-id': string;
  'data-test-subj'?: string;
  children: React.ReactNode | React.ReactNode[];
}

export const HeaderCTALink = (props: HeaderCTALinkProps) => (
  <EuiLink
    data-test-subj={props['data-test-subj'] || 'searchHomepageHeaderCTA'}
    href={props.href}
    target="_blank"
    // keep "search-promo-homepage" as the prefix for every tracking ID so we can filter on that prefix for the total homepage promo clicks overall
    data-telemetry-id={`search-promo-homepage-${props['data-telemetry-id']}`}
  >
    {props.children}
  </EuiLink>
);
