/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { combineLatest, map, ReplaySubject, scan, shareReplay, startWith, switchMap } from 'rxjs';
import type { NavigationSection } from '../page_template';

export interface NavigationRegistry {
  registerSections: (sections$: Observable<NavigationSection[]>) => void;
  sections$: Observable<NavigationSection[]>;
}

export const createNavigationRegistry = (): NavigationRegistry => {
  const registeredSections$ = new ReplaySubject<Observable<NavigationSection[]>>();

  const registerSections = (sections$: Observable<NavigationSection[]>) => {
    registeredSections$.next(sections$);
  };

  const sections$: Observable<NavigationSection[]> = registeredSections$.pipe(
    scan(
      (accumulatedSections$, newSections) => accumulatedSections$.add(newSections),
      new Set<Observable<NavigationSection[]>>()
    ),
    switchMap((registeredSections) =>
      // Use startWith to emit an empty array for each registered section immediately,
      // preventing sidebar flicker while waiting for async navigation data to load
      combineLatest([...registeredSections].map((section$) => section$.pipe(startWith([]))))
    ),
    map((registeredSections) =>
      registeredSections.flat().sort((first, second) => first.sortKey - second.sortKey)
    ),
    shareReplay(1)
  );

  return {
    registerSections,
    sections$,
  };
};
