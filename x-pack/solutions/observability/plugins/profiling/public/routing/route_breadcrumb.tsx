/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type React from 'react';
import qs from 'query-string';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useRouteBreadcrumb } from '../components/contexts/route_breadcrumbs_context/use_route_breadcrumb';
import { useSchemaQueryParam } from '../hooks/use_schema_query_param';

export const RouteBreadcrumb = ({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactElement;
}) => {
  const {
    start: { core },
  } = useProfilingDependencies();
  const schema = useSchemaQueryParam();

  useRouteBreadcrumb({
    title,
    // Keep the selected schema, merged into any query `href` already has
    href: core.http.basePath.prepend(
      qs.stringifyUrl({ url: '/app/profiling' + href, query: schema ? { schema } : {} })
    ),
  });

  return children;
};
