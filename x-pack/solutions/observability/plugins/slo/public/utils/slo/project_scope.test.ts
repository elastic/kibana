/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CPSProject } from '@kbn/cps-utils';
import { ALL_PROJECT_ROUTING, LOCAL_PROJECT_ROUTING } from '../../../common/project_routings';
import {
  getProjectScopeLabel,
  getSelectedProjectCount,
  getStaticProjectScopeLabel,
  isOriginProjectRouting,
  toStoredProjectRouting,
} from './project_scope';

const project = (id: string): CPSProject => ({
  _id: id,
  _alias: `${id}-alias`,
  _type: 'observability',
  _organisation: 'org',
});

const ORIGIN_ID = 'origin-1';
const availableProjects = [project(ORIGIN_ID), project('linked-1'), project('linked-2')];

describe('isOriginProjectRouting', () => {
  it('matches the canonical origin alias', () => {
    expect(isOriginProjectRouting(LOCAL_PROJECT_ROUTING, ORIGIN_ID)).toBe(true);
  });

  it('matches an equivalent origin id clause', () => {
    expect(isOriginProjectRouting('_id:origin-1', ORIGIN_ID)).toBe(true);
  });

  it('does not match another project id', () => {
    expect(isOriginProjectRouting('_id:linked-1', ORIGIN_ID)).toBe(false);
  });

  it('still matches the canonical alias without a known origin id', () => {
    expect(isOriginProjectRouting(LOCAL_PROJECT_ROUTING, undefined)).toBe(true);
  });

  it('cannot match an id clause without a known origin id', () => {
    expect(isOriginProjectRouting('_id:origin-1', undefined)).toBe(false);
  });
});

describe('toStoredProjectRouting', () => {
  it('collapses an origin-only snapshot selection to the canonical alias', () => {
    expect(toStoredProjectRouting('_id:origin-1', ORIGIN_ID)).toBe(LOCAL_PROJECT_ROUTING);
  });

  it('passes the all-projects alias through', () => {
    expect(toStoredProjectRouting(ALL_PROJECT_ROUTING, ORIGIN_ID)).toBe(ALL_PROJECT_ROUTING);
  });

  it('passes the canonical origin alias through', () => {
    expect(toStoredProjectRouting(LOCAL_PROJECT_ROUTING, ORIGIN_ID)).toBe(LOCAL_PROJECT_ROUTING);
  });

  it('preserves a multi-project snapshot selection verbatim', () => {
    expect(toStoredProjectRouting('_id:origin-1 OR _id:linked-1', ORIGIN_ID)).toBe(
      '_id:origin-1 OR _id:linked-1'
    );
  });
});

describe('getStaticProjectScopeLabel', () => {
  it('labels the all-projects alias', () => {
    expect(getStaticProjectScopeLabel(ALL_PROJECT_ROUTING)).toBe('All projects');
  });

  it('labels the origin alias', () => {
    expect(getStaticProjectScopeLabel(LOCAL_PROJECT_ROUTING)).toBe('This project');
  });

  it('returns undefined for a routing that needs a project lookup', () => {
    expect(getStaticProjectScopeLabel('_id:linked-1', ORIGIN_ID)).toBeUndefined();
  });
});

describe('getSelectedProjectCount', () => {
  it('counts every project for the all-projects alias', () => {
    expect(
      getSelectedProjectCount({
        availableProjects,
        originProjectId: ORIGIN_ID,
        projectRouting: ALL_PROJECT_ROUTING,
      })
    ).toBe(3);
  });

  it('counts one project for an origin-only routing', () => {
    expect(
      getSelectedProjectCount({
        availableProjects,
        originProjectId: ORIGIN_ID,
        projectRouting: LOCAL_PROJECT_ROUTING,
      })
    ).toBe(1);
  });

  it('counts explicit snapshot selections', () => {
    expect(
      getSelectedProjectCount({
        availableProjects,
        originProjectId: ORIGIN_ID,
        projectRouting: '_id:origin-1 OR _id:linked-2',
      })
    ).toBe(2);
  });

  it('ignores selected ids that are no longer linked', () => {
    expect(
      getSelectedProjectCount({
        availableProjects,
        originProjectId: ORIGIN_ID,
        projectRouting: '_id:linked-1 OR _id:unlinked-9',
      })
    ).toBe(1);
  });

  it('counts the complement of a dynamic exclusion routing', () => {
    expect(
      getSelectedProjectCount({
        availableProjects,
        originProjectId: ORIGIN_ID,
        projectRouting: '_id:* AND NOT _id:linked-1',
      })
    ).toBe(2);
  });
});

describe('getProjectScopeLabel', () => {
  it('prefers the static label when one applies', () => {
    expect(
      getProjectScopeLabel({
        availableProjects,
        originProjectId: ORIGIN_ID,
        projectRouting: ALL_PROJECT_ROUTING,
      })
    ).toBe('All projects');
  });

  it('falls back to a selected-over-total count', () => {
    expect(
      getProjectScopeLabel({
        availableProjects,
        originProjectId: ORIGIN_ID,
        projectRouting: '_id:origin-1 OR _id:linked-2',
      })
    ).toBe('2/3 projects');
  });
});
