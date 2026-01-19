/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getStreamObservable } from './stream_observable';
import { API_ERROR } from '../translations';

import type { PromptObservableState } from './types';
import { Subject } from 'rxjs';
describe('getStreamObservable', () => {
  const mockReader = {
    read: jest.fn(),
    cancel: jest.fn(),
  };

  const typedReader = mockReader as unknown as ReadableStreamDefaultReader<Uint8Array>;

  const setLoading = jest.fn();
  const defaultProps = {
    isError: false,
    reader: typedReader,
    setLoading,
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should emit loading state and chunks for LangChain', (done) => {
    const chunk1 = `{"payload":"","type":"content"}
{"payload":"My","type":"content"}
{"payload":" ","type":"content"}
{"payload":"new","type":"content"}
`;
    const chunk2 = `{"payload":" mes","type":"content"}
{"payload":"sage","type":"content"}
`;
    const completeSubject = new Subject<void>();
    const expectedStates: PromptObservableState[] = [
      {
        chunks: [],
        loading: true,
      },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My',
        loading: true,
      },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My ',
        loading: true,
      },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My new',
        loading: true,
      },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My new mes',
        loading: true,
      },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My new message',
        loading: true,
      },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My new message',
        loading: false,
      },
    ];

    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(new TextEncoder().encode(chunk1)),
      })
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(new TextEncoder().encode(chunk2)),
      })
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(new TextEncoder().encode('')),
      })
      .mockResolvedValue({
        done: true,
      });

    const source = getStreamObservable(defaultProps);
    const emittedStates: PromptObservableState[] = [];

    source.subscribe({
      next: (state) => {
        return emittedStates.push(state);
      },
      complete: () => {
        expect(emittedStates).toEqual(expectedStates);
        done();

        completeSubject.subscribe({
          next: () => {
            expect(setLoading).toHaveBeenCalledWith(false);
            expect(typedReader.cancel).toHaveBeenCalled();
            done();
          },
        });
      },
      error: (err) => done(err),
    });
  });
  it('should emit loading state and chunks for partial response LangChain', (done) => {
    const chunk1 = `{"payload":"","type":"content"}
{"payload":"My","type":"content"}
{"payload":" ","type":"content"}
{"payload":"new","type":"content"}
{"payl`;
    const chunk2 = `oad":" mes","type":"content"}
{"payload":"sage","type":"content"}`;
    const completeSubject = new Subject<void>();
    const expectedStates: PromptObservableState[] = [
      { chunks: [], loading: true },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My',
        loading: true,
      },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My ',
        loading: true,
      },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My new',
        loading: true,
      },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My new mes',
        loading: true,
      },
      {
        chunks: ['My', ' ', 'new', ' mes', 'sage'],
        message: 'My new message',
        loading: false,
      },
    ];

    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(new TextEncoder().encode(chunk1)),
      })
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(new TextEncoder().encode(chunk2)),
      })
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(new TextEncoder().encode('')),
      })
      .mockResolvedValue({
        done: true,
      });

    const source = getStreamObservable(defaultProps);
    const emittedStates: PromptObservableState[] = [];

    source.subscribe({
      next: (state) => {
        return emittedStates.push(state);
      },
      complete: () => {
        expect(emittedStates).toEqual(expectedStates);
        done();

        completeSubject.subscribe({
          next: () => {
            expect(setLoading).toHaveBeenCalledWith(false);
            expect(typedReader.cancel).toHaveBeenCalled();
            done();
          },
        });
      },
      error: (err) => done(err),
    });
  });

  it('should stream errors when reader contains errors', (done) => {
    const completeSubject = new Subject<void>();
    const expectedStates: PromptObservableState[] = [
      { chunks: [], loading: true },
      {
        chunks: [`${API_ERROR}\n\nis an error`],
        message: `${API_ERROR}\n\nis an error`,
        loading: true,
      },
      {
        chunks: [`${API_ERROR}\n\nis an error`],
        message: `${API_ERROR}\n\nis an error`,
        loading: false,
      },
    ];

    mockReader.read
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(new TextEncoder().encode(JSON.stringify({ message: 'is an error' }))),
      })
      .mockResolvedValue({
        done: true,
      });

    const source = getStreamObservable({
      ...defaultProps,
      isError: true,
    });
    const emittedStates: PromptObservableState[] = [];

    source.subscribe({
      next: (state) => emittedStates.push(state),
      complete: () => {
        expect(emittedStates).toEqual(expectedStates);
        done();

        completeSubject.subscribe({
          next: () => {
            expect(setLoading).toHaveBeenCalledWith(false);
            expect(typedReader.cancel).toHaveBeenCalled();
            done();
          },
        });
      },
      error: (err) => done(err),
    });
  });

  it('should handle errors', (done) => {
    const completeSubject = new Subject<void>();
    const error = new Error('Test Error');
    // Simulate an error
    mockReader.read.mockRejectedValue(error);
    const source = getStreamObservable(defaultProps);

    source.subscribe({
      next: (state) => {},
      complete: () => done(new Error('Should not complete')),
      error: (err) => {
        expect(err).toEqual(error);
        done();
        completeSubject.subscribe({
          next: () => {
            expect(setLoading).toHaveBeenCalledWith(false);
            expect(typedReader.cancel).toHaveBeenCalled();
            done();
          },
        });
      },
    });
  });
});
