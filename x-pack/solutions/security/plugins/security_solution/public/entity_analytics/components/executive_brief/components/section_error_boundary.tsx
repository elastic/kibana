/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';

interface Props {
  /** Shown instead of the children when they throw while rendering. */
  fallbackText: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/** Keeps a render error in one part of the brief (e.g. the graph) from taking down the rest. */
export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <EuiText size="s" color="subdued" data-test-subj="executiveBriefSectionError">
          <p>{this.props.fallbackText}</p>
        </EuiText>
      );
    }
    return this.props.children;
  }
}
