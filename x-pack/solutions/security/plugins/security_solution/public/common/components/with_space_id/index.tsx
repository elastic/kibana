/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import type { ComponentType } from 'react';
import type { ReactElement } from 'react-markdown';
import { useSpaceId } from '../../hooks/use_space_id';

type OmitSpaceId<T extends { spaceId: string }> = Omit<T, 'spaceId'>;

interface WithSpaceIdArgs {
  spaceId: string;
}

/**
 *
 * This HOC ensures that component get valid non-null
 * spaceId if the component needs it is as an invariant
 *
 * */
export const withSpaceId = <P extends WithSpaceIdArgs>(
  Component: ComponentType<OmitSpaceId<P> & WithSpaceIdArgs>,
  fallback?: ReactElement
) => {
  const ComponentWithSpaceId = (props: OmitSpaceId<P>) => {
    const spaceId = useSpaceId();

    if (!spaceId) {
      return (
        fallback ?? (
          <EuiButton color="text">
            <EuiLoadingSpinner data-test-subj="filter-group__loading" />
          </EuiButton>
        )
      );
    }

    return <Component {...props} spaceId={spaceId} />;
  };

  return ComponentWithSpaceId;
};
