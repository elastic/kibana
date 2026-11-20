/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { Component } from 'react';

interface QuietErrorBoundaryProps {
  /** Receives the failure so that it is reported even though nothing is shown. */
  onError: (error: Error) => void;
  children: ReactNode;
}

interface QuietErrorBoundaryState {
  hasFailed: boolean;
}

/** Renders nothing in place of decorative content that failed to load or render. */
export class QuietErrorBoundary extends Component<
  QuietErrorBoundaryProps,
  QuietErrorBoundaryState
> {
  public state: QuietErrorBoundaryState = { hasFailed: false };

  public static getDerivedStateFromError(): QuietErrorBoundaryState {
    return { hasFailed: true };
  }

  public componentDidCatch(error: Error): void {
    this.props.onError(error);
  }

  public render(): ReactNode {
    return this.state.hasFailed ? null : this.props.children;
  }
}
