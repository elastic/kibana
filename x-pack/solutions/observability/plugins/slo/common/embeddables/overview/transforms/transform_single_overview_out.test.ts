/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewEmbeddableState } from '../../../../server/lib/embeddables/schema';
import { transformSingleOverviewOut } from './transform_single_overview_out';

describe('transformSingleOverviewOut', () => {
  it('should transform legacy state to new format', () => {
    expect(
      transformSingleOverviewOut({
        sloId: 'legacy-slo-id',
        sloInstanceId: 'legacy-instance-id',
        remoteName: 'legacy-remote',
        overviewMode: 'single',
        showAllGroupByInstances: true,
        title: 'Test Title',
      } as unknown as OverviewEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "overview_mode": "single",
        "remote_name": "legacy-remote",
        "slo_id": "legacy-slo-id",
        "slo_instance_id": "legacy-instance-id",
        "title": "Test Title",
      }
    `);
  });

  it('should return state unchanged when no legacy fields are present', () => {
    expect(
      transformSingleOverviewOut({
        slo_id: 'new-slo-id',
        slo_instance_id: 'new-instance-id',
        overview_mode: 'single',
        title: 'Test Title',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "overview_mode": "single",
        "slo_id": "new-slo-id",
        "slo_instance_id": "new-instance-id",
        "title": "Test Title",
      }
    `);
  });

  it('should drop slo_instance_id for legacy non-grouped SLOs with sloInstanceId "*" and showAllGroupByInstances false', () => {
    expect(
      transformSingleOverviewOut({
        sloId: 'non-grouped-slo-id',
        sloInstanceId: '*',
        overviewMode: 'single',
        showAllGroupByInstances: false,
      } as unknown as OverviewEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "overview_mode": "single",
        "slo_id": "non-grouped-slo-id",
      }
    `);
  });

  it('should keep slo_instance_id for legacy grouped SLOs with sloInstanceId "*" and showAllGroupByInstances true', () => {
    expect(
      transformSingleOverviewOut({
        sloId: 'grouped-slo-id',
        sloInstanceId: '*',
        overviewMode: 'single',
        showAllGroupByInstances: true,
      } as unknown as OverviewEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "overview_mode": "single",
        "slo_id": "grouped-slo-id",
        "slo_instance_id": "*",
      }
    `);
  });

  it('should keep slo_instance_id for legacy grouped SLOs with a specific instance', () => {
    expect(
      transformSingleOverviewOut({
        sloId: 'grouped-slo-id',
        sloInstanceId: 'specific-instance-id',
        overviewMode: 'single',
        showAllGroupByInstances: false,
      } as unknown as OverviewEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "overview_mode": "single",
        "slo_id": "grouped-slo-id",
        "slo_instance_id": "specific-instance-id",
      }
    `);
  });
});
