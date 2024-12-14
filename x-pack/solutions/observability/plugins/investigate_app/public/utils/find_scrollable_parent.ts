/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function findScrollableParent(parent: HTMLElement | null) {
  while (parent && parent !== window.document.body) {
    if (parent.scrollHeight > parent.clientHeight) {
      const computed = getComputedStyle(parent);
      if (computed.overflowY === 'auto' || computed.overflowY === 'scroll') {
        return parent;
      }
    }
    parent = parent.parentElement;
  }

  return window.document.documentElement;
}
