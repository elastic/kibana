/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useConverseOnce } from './use_converse_api';
import { useDefaultAiConnector } from './use_default_ai_connector';

jest.mock('./use_default_ai_connector');
const mockConnector = jest.mocked(useDefaultAiConnector);
const mockPost = jest.fn();
const mockAddDanger = jest.fn();
const mockServices = {
  http: { post: mockPost },
  notifications: { toasts: { addDanger: mockAddDanger } },
};
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: mockServices }),
}));

interface TestResponse {
  response: { message: string };
  conversation_id: string;
}

const deferred = () => {
  let resolve: (value: TestResponse) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<TestResponse>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};
const response = (message: string): TestResponse => ({
  response: { message },
  conversation_id: 'brief-conversation',
});
const connector = {
  connectorId: 'connector-one',
  connectorName: 'Model one',
  hasConnector: true,
  isLoading: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockConnector.mockReturnValue(connector);
  mockPost.mockResolvedValue(response('A grounded brief.'));
});

it('exposes connector resolution separately from an absent connector', () => {
  mockConnector.mockReturnValue({
    connectorId: '',
    connectorName: '',
    hasConnector: false,
    isLoading: true,
  });
  const { result } = renderHook(useConverseOnce);
  expect(result.current.hasConnector).toBe(false);
  expect(result.current.isConnectorLoading).toBe(true);
  expect(result.current.connectorId).toBe('');
  expect(mockPost).not.toHaveBeenCalled();
});

it('preserves the requested connector name when the selected connector changes', async () => {
  const pending = deferred();
  mockPost.mockReturnValue(pending.promise);
  const { result, rerender } = renderHook(useConverseOnce);
  act(() => result.current.generate('Snapshot one'));
  expect(JSON.parse(mockPost.mock.calls[0][1].body)).toEqual({
    input: 'Snapshot one',
    connector_id: 'connector-one',
  });
  mockConnector.mockReturnValue({
    ...connector,
    connectorId: 'connector-two',
    connectorName: 'Model two',
  });
  rerender();
  expect(result.current.connectorId).toBe('connector-two');
  expect(result.current.connectorName).toBe('Model one');
  await act(async () => pending.resolve(response('Snapshot one result')));
  expect(result.current.result).toBe('Snapshot one result');
  expect(result.current.connectorName).toBe('Model one');
  expect(result.current.generatedAt).toEqual(expect.any(Number));
  act(() => result.current.reset());
  expect(result.current.connectorName).toBe('Model two');
});

it('aborts a superseded request and ignores its eventual failure', async () => {
  const first = deferred();
  const second = deferred();
  mockPost.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const { result } = renderHook(useConverseOnce);
  act(() => result.current.generate('Old snapshot'));
  const firstSignal: AbortSignal = mockPost.mock.calls[0][1].signal;
  act(() => result.current.generate('New snapshot'));
  expect(firstSignal.aborted).toBe(true);
  await act(async () => first.reject(new Error('Old request failed')));
  expect(result.current.isGenerating).toBe(true);
  expect(result.current.error).toBeUndefined();
  expect(mockAddDanger).not.toHaveBeenCalled();
  await act(async () => second.resolve(response('New snapshot result')));
  expect(result.current.result).toBe('New snapshot result');
  expect(result.current.isGenerating).toBe(false);
});

it('clears the previous result while a fresh snapshot is generating', async () => {
  const { result } = renderHook(useConverseOnce);
  act(() => result.current.generate('First snapshot'));
  await waitFor(() => expect(result.current.result).toBe('A grounded brief.'));
  const next = deferred();
  mockPost.mockReturnValue(next.promise);
  act(() => result.current.generate('Second snapshot'));
  expect(result.current.result).toBeUndefined();
  expect(result.current.generatedAt).toBeUndefined();
  expect(result.current.isGenerating).toBe(true);
  await act(async () => next.resolve(response('Second brief')));
  expect(result.current.result).toBe('Second brief');
});

it('aborts reset requests and ignores late successful responses', async () => {
  const pending = deferred();
  mockPost.mockReturnValue(pending.promise);
  const { result } = renderHook(useConverseOnce);
  act(() => result.current.generate('Discarded snapshot'));
  const signal: AbortSignal = mockPost.mock.calls[0][1].signal;
  act(() => result.current.reset());
  expect(signal.aborted).toBe(true);
  await act(async () => pending.resolve(response('Discarded brief')));
  expect(result.current.result).toBeUndefined();
  expect(result.current.generatedAt).toBeUndefined();
  expect(result.current.isGenerating).toBe(false);
});

it('aborts on unmount without emitting a late failure notification', async () => {
  const pending = deferred();
  mockPost.mockReturnValue(pending.promise);
  const { result, unmount } = renderHook(useConverseOnce);
  act(() => result.current.generate('Closed brief'));
  const signal: AbortSignal = mockPost.mock.calls[0][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => pending.reject(new Error('Aborted')));
  expect(mockAddDanger).not.toHaveBeenCalled();
});

it('reports a current request error and leaves no prior result to export', async () => {
  mockPost.mockRejectedValue(new Error('Connector unavailable'));
  const { result } = renderHook(useConverseOnce);
  act(() => result.current.generate('Current snapshot'));
  await waitFor(() => expect(result.current.isGenerating).toBe(false));
  expect(result.current.error).toBe('Connector unavailable');
  expect(result.current.result).toBeUndefined();
  expect(result.current.generatedAt).toBeUndefined();
  expect(mockAddDanger).toHaveBeenCalledWith({ title: 'Connector unavailable' });
});
