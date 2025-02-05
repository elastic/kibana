/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * NOTE: We can't test this component because Enzyme doesn't support rendering
 * into portals.
 */

import deepEqual from 'fast-deep-equal';
import type { ReactNode } from 'react';
import { Component } from 'react';
import { createPortal } from 'react-dom';

export interface CustomEuiPortalProps {
  /**
   * ReactNode to render as this component's content
   */
  children: ReactNode;
  /**
   * Sibling is the React node or HTMLElement to insert the portal next to
   * Position specifies the portal's relative position, either before or after
   */
  sibling: HTMLDivElement | null;
}

export class CustomEuiPortal extends Component<CustomEuiPortalProps> {
  portalNode: HTMLDivElement | null = null;

  constructor(props: CustomEuiPortalProps) {
    super(props);
    if (typeof window === 'undefined') return; // Prevent SSR errors

    const { sibling } = this.props;

    this.portalNode = document.createElement('div');
    this.portalNode.dataset.euiportal = 'true';

    if (sibling == null) {
      // no insertion defined, append to body
      document.body.appendChild(this.portalNode);
    } else {
      // inserting before or after an element
      sibling.insertAdjacentElement('afterend', this.portalNode);
    }
  }

  componentWillUnmount() {
    if (this.portalNode?.parentNode) {
      this.portalNode.parentNode.removeChild(this.portalNode);
    }
  }

  componentDidUpdate(prevProps: Readonly<CustomEuiPortalProps>): void {
    if (!deepEqual(prevProps.sibling, this.props.sibling) && this.portalNode?.parentNode) {
      this.portalNode.parentNode.removeChild(this.portalNode);
    }

    if (this.portalNode) {
      if (this.props == null || this.props.sibling == null) {
        // no insertion defined, append to body
        document.body.appendChild(this.portalNode);
      } else {
        // inserting before or after an element
        const { sibling } = this.props;
        sibling.insertAdjacentElement('afterend', this.portalNode);
      }
    }
  }

  render() {
    return this.portalNode ? createPortal(this.props.children, this.portalNode) : null;
  }
}
