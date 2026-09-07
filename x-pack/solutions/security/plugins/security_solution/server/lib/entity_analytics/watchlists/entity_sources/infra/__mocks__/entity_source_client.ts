/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockCreateEntitySource = jest.fn();
export const mockUpsertEntitySource = jest.fn();
export const mockUpdateEntitySource = jest.fn();
export const mockGetEntitySource = jest.fn();
export const mockDeleteEntitySource = jest.fn();
export const mockFindEntitySources = jest.fn();
export const mockListEntitySources = jest.fn();
export const mockGetLastProcessedMarker = jest.fn();
export const mockUpdateLastProcessedMarker = jest.fn();
export const mockGetLastFullSyncMarker = jest.fn();
export const mockUpdateLastFullSyncMarker = jest.fn();

export class WatchlistEntitySourceClient {
  public create = mockCreateEntitySource;
  public upsert = mockUpsertEntitySource;
  public update = mockUpdateEntitySource;
  public get = mockGetEntitySource;
  public delete = mockDeleteEntitySource;
  public find = mockFindEntitySources;
  public list = mockListEntitySources;
  public getLastProcessedMarker = mockGetLastProcessedMarker;
  public updateLastProcessedMarker = mockUpdateLastProcessedMarker;
  public getLastFullSyncMarker = mockGetLastFullSyncMarker;
  public updateLastFullSyncMarker = mockUpdateLastFullSyncMarker;
}
