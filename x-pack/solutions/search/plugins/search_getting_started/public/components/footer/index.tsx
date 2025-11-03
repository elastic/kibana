/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { DocCallouts } from './doc_callouts';
import { footerLinks } from './footer_links';

export const GettingStartedFooter = () => {
  const currentBreakpoint = useCurrentEuiBreakpoint();
  return (
    <>
      <EuiHorizontalRule />
      <EuiSpacer size="xxl" />
      <EuiFlexGroup direction={currentBreakpoint === 'xl' ? 'row' : 'column'}>
        {footerLinks.map((item) => (
          <EuiFlexItem key={item.id} data-test-subj={`${item.id}Section`}>
            <DocCallouts
              title={item.title}
              description={item.description}
              buttonHref={item.buttonHref}
              buttonLabel={item.buttonLabel}
              dataTestSubj={item.dataTestSubj}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
    </>
  );
};
