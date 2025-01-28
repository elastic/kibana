/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export const useSecuritySolutionLinkProps = jest.fn(({ path }: { path: string }) => ({
  href: path || '',
  onClick: () => {},
}));
export const useGetSecuritySolutionLinkProps = () => useSecuritySolutionLinkProps;

export const withSecuritySolutionLink = <T extends Partial<{ href: string }>>(
  WrappedComponent: React.ComponentType<T>
) =>
  function WithSecuritySolutionLink({ path, ...rest }: Omit<T, 'href'> & { path: string }) {
    return (
      <WrappedComponent
        {...({ ...useSecuritySolutionLinkProps({ path }), ...rest } as unknown as T)}
      />
    );
  };
