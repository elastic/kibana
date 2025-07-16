/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiImage,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';

import { useKibana } from '../../hooks/use_kibana';

import { WorkflowFeatureBullet } from './workflow_feature_bullet';

interface WorkflowProps {
  image: string;
  imageAlt: string;
  heading: string;
  subheading: string;
  featureBullets: string[];
  buttonLabel: string;
  dataTestSubj: string;
}

export const AISearchWorkflow = ({ capability }: { capability: WorkflowProps }) => {
  const currentBreakpoint = useCurrentEuiBreakpoint();
  const { share } = useKibana().services;
  const createIndexUrl = share?.url.locators
    .get('SEARCH_CREATE_INDEX')
    ?.useUrl({ workflow: 'vector' });

  return (
    <EuiPanel color="transparent" paddingSize="s">
      <EuiFlexGroup gutterSize="l" direction={currentBreakpoint === 'xl' ? 'row' : 'column'}>
        <EuiFlexItem grow={false}>
          <span>
            <EuiImage src={capability.image} alt={capability.imageAlt} size="s" />
          </span>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h4>{capability.heading}</h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="m" color="subdued">
            <p>{capability.subheading}</p>
          </EuiText>
          <EuiSpacer size="s" />

          <EuiFlexGroup direction="column" gutterSize="xs">
            {capability.featureBullets.map((item: string, index: number) => (
              <EuiFlexItem grow={false} key={index}>
                <WorkflowFeatureBullet feature={item} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer />

          <span>
            <EuiButton
              iconType="plusInCircle"
              href={createIndexUrl}
              data-test-subj={capability.dataTestSubj}
            >
              {capability.buttonLabel}
            </EuiButton>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
