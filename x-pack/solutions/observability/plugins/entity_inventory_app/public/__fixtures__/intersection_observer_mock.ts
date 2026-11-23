/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Test-only `IntersectionObserver`: JSDOM has none, so a test installs this one and decides when an
 * element intersects. Nothing in the app imports it.
 */
class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly observed = new Set<Element>();
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly scrollMargin = '0px';
  readonly thresholds: readonly number[] = [];

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.root = options?.root ?? null;
    this.rootMargin = options?.rootMargin ?? '0px';
    MockIntersectionObserver.instances.push(this);
  }

  observe = (element: Element) => {
    this.observed.add(element);
  };

  unobserve = (element: Element) => {
    this.observed.delete(element);
  };

  disconnect = () => {
    this.observed.clear();
  };

  takeRecords = (): IntersectionObserverEntry[] => [];

  notify(target: Element, isIntersecting: boolean) {
    this.callback([{ target, isIntersecting } as IntersectionObserverEntry], this);
  }
}

export interface IntersectionObserverMockControls {
  /** Reports `element` as intersecting, or not, to every observer that is watching it. */
  setIntersecting: (element: Element, isIntersecting: boolean) => void;
  /** The root margins of the observers that are watching `element` right now. */
  getRootMargins: (element: Element) => string[];
  /** The `root` of the observers that are watching `element` right now, `null` for the viewport. */
  getRoots: (element: Element) => Array<Element | Document | null>;
  restore: () => void;
}

export const installIntersectionObserverMock = (): IntersectionObserverMockControls => {
  const original = Object.getOwnPropertyDescriptor(window, 'IntersectionObserver');
  MockIntersectionObserver.instances = [];
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });

  const watching = (element: Element) =>
    MockIntersectionObserver.instances.filter(({ observed }) => observed.has(element));

  return {
    setIntersecting: (element, isIntersecting) =>
      watching(element).forEach((observer) => observer.notify(element, isIntersecting)),
    getRootMargins: (element) => watching(element).map(({ rootMargin }) => rootMargin),
    getRoots: (element) => watching(element).map(({ root }) => root),
    restore: () => {
      MockIntersectionObserver.instances = [];
      if (original) {
        Object.defineProperty(window, 'IntersectionObserver', original);
      } else {
        delete (window as { IntersectionObserver?: unknown }).IntersectionObserver;
      }
    },
  };
};
