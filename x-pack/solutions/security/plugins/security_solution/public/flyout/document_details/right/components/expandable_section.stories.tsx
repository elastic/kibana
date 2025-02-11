/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ExpandableSection } from './expandable_section';

const title = <p>{'title'}</p>;
const children = <div>{'content'}</div>;

export default {
  component: ExpandableSection,
  title: 'Flyout/ExpandableSection',
};

export const Expand: Story<void> = () => {
  return (
    <ExpandableSection expanded={false} title={title}>
      {children}
    </ExpandableSection>
  );
};

export const Collapse: Story<void> = () => {
  return (
    <ExpandableSection expanded={true} title={title}>
      {children}
    </ExpandableSection>
  );
};
