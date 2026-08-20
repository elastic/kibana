/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchSloDefinitionsWithRemote } from './use_fetch_slo_definitions_with_remote';
import { useHasSlos } from './use_has_slos';

jest.mock('./use_fetch_slo_definitions_with_remote');

const useFetchSloDefinitionsWithRemoteMock = useFetchSloDefinitionsWithRemote as jest.Mock;

describe('useHasSlos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns hasSlos: false and isLoading: true while the request is in flight', () => {
    useFetchSloDefinitionsWithRemoteMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { hasSlos, isLoading, isError } = useHasSlos();

    expect(hasSlos).toBe(false);
    expect(isLoading).toBe(true);
    expect(isError).toBe(false);
  });

  it('returns hasSlos: false when the results array is empty (no local or remote SLOs)', () => {
    useFetchSloDefinitionsWithRemoteMock.mockReturnValue({
      data: { results: [] },
      isLoading: false,
      isError: false,
    });

    const { hasSlos, isLoading, isError } = useHasSlos();

    expect(hasSlos).toBe(false);
    expect(isLoading).toBe(false);
    expect(isError).toBe(false);
  });

  it('returns hasSlos: true when at least one local SLO exists', () => {
    useFetchSloDefinitionsWithRemoteMock.mockReturnValue({
      data: {
        results: [{ id: 'slo-1', name: 'My SLO', groupBy: [] }],
      },
      isLoading: false,
      isError: false,
    });

    const { hasSlos } = useHasSlos();

    expect(hasSlos).toBe(true);
  });

  it('returns hasSlos: true when at least one remote SLO exists', () => {
    useFetchSloDefinitionsWithRemoteMock.mockReturnValue({
      data: {
        results: [
          {
            id: 'remote-slo-1',
            name: 'Remote SLO',
            groupBy: [],
            remote: { remoteName: 'remote-cluster', kibanaUrl: 'https://remote.kibana' },
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    const { hasSlos } = useHasSlos();

    expect(hasSlos).toBe(true);
    expect(useFetchSloDefinitionsWithRemoteMock).toHaveBeenCalledWith({ size: 1 });
  });

  it('returns isError: true and hasSlos: false on request failure', () => {
    useFetchSloDefinitionsWithRemoteMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    const { hasSlos, isError } = useHasSlos();

    expect(hasSlos).toBe(false);
    expect(isError).toBe(true);
  });
});
