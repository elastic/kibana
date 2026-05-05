/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { NotFoundRouteException } from '@kbn/typed-react-router-config';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';
import { useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { KibanaErrorBoundary } from '@kbn/shared-ux-error-boundary';
import type { ProfilingPluginPublicStartDeps } from '../types';

export function RouterErrorBoundary({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
  resetKey: string;
}

interface ErrorBoundaryState {
  error?: Error;
  resetKey: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: undefined, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error: Error): Pick<ErrorBoundaryState, 'error'> {
    return { error };
  }

  static getDerivedStateFromProps(
    nextProps: ErrorBoundaryProps,
    prevState: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    if (nextProps.resetKey !== prevState.resetKey) {
      // Pathname changed: clear any previous error so the new route renders normally.
      return { error: undefined, resetKey: nextProps.resetKey };
    }
    return null;
  }

  render() {
    if (this.state.error) {
      return <ErrorWithTemplate error={this.state.error} />;
    }

    return this.props.children;
  }
}

const pageHeader = {
  pageTitle: i18n.translate('xpack.profiling.universalProfiling', {
    defaultMessage: 'Universal Profiling',
  }),
};

function ErrorWithTemplate({ error }: { error: Error }) {
  const { services } = useKibana<ProfilingPluginPublicStartDeps>();
  const { observabilityShared } = services;

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

  if (error instanceof NotFoundRouteException) {
    return (
      <ObservabilityPageTemplate pageHeader={pageHeader}>
        <NotFoundPrompt />
      </ObservabilityPageTemplate>
    );
  }

  return (
    <ObservabilityPageTemplate pageHeader={pageHeader}>
      <KibanaErrorBoundary>
        <DummyComponent error={error} />
      </KibanaErrorBoundary>
    </ObservabilityPageTemplate>
  );
}

function DummyComponent({ error }: { error: Error }): any {
  throw error;
}
