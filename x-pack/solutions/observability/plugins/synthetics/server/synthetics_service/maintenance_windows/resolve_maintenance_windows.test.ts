/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import {
  InvalidMaintenanceWindowError,
  resolveMaintenanceWindowRefs,
  resolveMaintenanceWindowsOrThrow,
} from './resolve_maintenance_windows';

const mw = (id: string, title: string): MaintenanceWindow => ({ id, title } as MaintenanceWindow);

const maintenanceWindows = [
  mw('id-1', 'Weekend window'),
  mw('id-2', 'Nightly Deploy'),
  mw('id-3', 'Duplicate'),
  mw('id-4', 'Duplicate'),
];

describe('resolveMaintenanceWindowRefs', () => {
  it('matches by id', () => {
    expect(resolveMaintenanceWindowRefs(['id-1', 'id-2'], maintenanceWindows)).toEqual({
      ids: ['id-1', 'id-2'],
      invalid: [],
      ambiguous: [],
    });
  });

  it('matches by title (case-insensitive and trimmed)', () => {
    expect(
      resolveMaintenanceWindowRefs(['weekend window', '  Nightly Deploy '], maintenanceWindows)
    ).toEqual({
      ids: ['id-1', 'id-2'],
      invalid: [],
      ambiguous: [],
    });
  });

  it('prefers an id match over a title match', () => {
    const windows = [mw('shared', 'Alpha'), mw('other', 'shared')];
    expect(resolveMaintenanceWindowRefs(['shared'], windows)).toEqual({
      ids: ['shared'],
      invalid: [],
      ambiguous: [],
    });
  });

  it('dedupes resolved ids while preserving order', () => {
    expect(
      resolveMaintenanceWindowRefs(['id-1', 'Weekend window', 'id-2'], maintenanceWindows)
    ).toEqual({
      ids: ['id-1', 'id-2'],
      invalid: [],
      ambiguous: [],
    });
  });

  it('reports unknown refs as invalid', () => {
    expect(resolveMaintenanceWindowRefs(['id-1', 'nope'], maintenanceWindows)).toEqual({
      ids: ['id-1'],
      invalid: ['nope'],
      ambiguous: [],
    });
  });

  it('reports refs matching multiple titles as ambiguous', () => {
    expect(resolveMaintenanceWindowRefs(['Duplicate'], maintenanceWindows)).toEqual({
      ids: [],
      invalid: [],
      ambiguous: ['Duplicate'],
    });
  });
});

describe('resolveMaintenanceWindowsOrThrow', () => {
  it('returns [] for undefined refs', () => {
    expect(resolveMaintenanceWindowsOrThrow(undefined, maintenanceWindows)).toEqual([]);
  });

  it('returns [] for empty refs', () => {
    expect(resolveMaintenanceWindowsOrThrow([], maintenanceWindows)).toEqual([]);
  });

  it('throws when refs are supplied but no maintenance windows are available', () => {
    expect(() => resolveMaintenanceWindowsOrThrow(['id-1', 'some-name'], [])).toThrow(
      InvalidMaintenanceWindowError
    );
  });

  it('resolves names and ids to ids', () => {
    expect(
      resolveMaintenanceWindowsOrThrow(['Weekend window', 'id-2'], maintenanceWindows)
    ).toEqual(['id-1', 'id-2']);
  });

  it('throws InvalidMaintenanceWindowError for unknown refs', () => {
    expect(() => resolveMaintenanceWindowsOrThrow(['nope'], maintenanceWindows)).toThrow(
      InvalidMaintenanceWindowError
    );
  });

  it('throws InvalidMaintenanceWindowError for ambiguous refs', () => {
    expect(() => resolveMaintenanceWindowsOrThrow(['Duplicate'], maintenanceWindows)).toThrow(
      InvalidMaintenanceWindowError
    );
  });

  it('does not include available maintenance window titles in the error message', () => {
    const resolve = () => resolveMaintenanceWindowsOrThrow(['nope'], maintenanceWindows);

    expect(resolve).toThrow(/nope/);
    expect(resolve).not.toThrow(/Weekend window/);
  });
});
