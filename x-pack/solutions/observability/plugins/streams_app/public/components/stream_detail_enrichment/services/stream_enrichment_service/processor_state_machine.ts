/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActorRef, Snapshot, assign, sendTo, setup } from 'xstate5';
import { ProcessorDefinitionWithUIAttributes } from '../../types';

export type ProcessorToParentEvent =
  | { type: 'processor.change' }
  | { type: 'processor.stage' }
  | { type: 'processor.delete'; id: string };

export type ProcessorParentActor = ActorRef<Snapshot<unknown>, ProcessorToParentEvent>;

export interface ProcessorMachineContext {
  parentRef: ProcessorParentActor;
  initialProcessor: ProcessorDefinitionWithUIAttributes;
  processor: ProcessorDefinitionWithUIAttributes;
  isNew: boolean;
}

const getParentRef = ({ context }: { context: ProcessorMachineContext }) => context.parentRef;

export const processorMachine = setup({
  types: {
    input: {} as {
      parentRef: ProcessorParentActor;
      processor: ProcessorDefinitionWithUIAttributes;
      isNew?: boolean;
    },
    context: {} as ProcessorMachineContext,
    events: {} as
      | { type: 'processor.stage' }
      | { type: 'processor.cancel' }
      | { type: 'processor.delete' }
      | { type: 'processor.edit' }
      | { type: 'processor.update' }
      | { type: 'processor.change'; processor: ProcessorDefinitionWithUIAttributes },
  },
  actors: {},
  actions: {
    changeProcessor: assign((_, params: { processor: ProcessorDefinitionWithUIAttributes }) => ({
      processor: params.processor,
    })),
    restoreInitialProcessor: assign(({ context }) => ({
      processor: context.initialProcessor,
    })),
    updateProcessor: assign(({ context }) => ({
      initialProcessor: context.processor,
    })),
    emitProcessorChange: sendTo(getParentRef, { type: 'processor.change' }),
    emitProcessorDelete: sendTo(getParentRef, ({ context }) => ({
      type: 'processor.delete',
      id: context.processor.id,
    })),
  },
  guards: {
    isDraft: ({ context }) => context.isNew,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AxnW7UDoBXAO1TnQBsA3SAYgG0AGAXURXVgEsAXT9YtiAAeiAIwB2AGz5xAZgAssuQFYl8gByTVAGhABPRLIBMR-AE5Gko7LOz1s5csnqAvi91osOPEVLlqdPSirEggyBw8fAKhIggS0nKKKmqaOvqI6qL48ma5tozyjHaS4m4eGNiwuAQQqACGAGbctJ6V1fiw3HUwTCHsXLz8grHKEjLyJuqKsiVGmroGCLKiWQqSCjlmkhOiymVhFd419U0th1U+mHXE2BS9guEDUcOIVgti4ozi+OrK9uI5L5mX77VpHfC1RrNMEXAiYAAW1x6LAeEUG0VAsRWDmyRlEmVGqkUknecVy5jyZhMojUojmoPO7U63Ug+E4EAoYDOXlh+EgPHuoUekSGMUMilx+MkK3E6kY6i24lJ+PsPxWhS0xkcVIZPKZXRgED5EEixCg3LaPkIyAgdW4YEF-RFGOEhkYjHwf2UZhpy3dkgKpKMRQ9UkUondALmsl1loIzMNxtN5ph7SuNzAdxRQrRzzFS3dnt+PtkfssgfSZIU+GWdPkn12ykU8lj4ITrP5vDNFvBEEzYHtjrCudFmNeNmyUyUln+llEQdEZm+8hKDk2pesrd57aNnc43dTl0RZod2ad6JeCE0FMpt7yyp9ZnMU2l6jx6nEdJj7gOep8yDAVAuE6Vl2U5HteU7IdhQvfNF2UT13UjT5gWMeRSXsBDxCMJwpBpLQCj2H9DwIACgM4EDdxNLsU0ZK0bTtU8+mHJ5R1dOIJGVZRP2yRhVBWKYqXkJst3aMjgPtKjkwgtNrluaCRxdLEzAQ5QkK+FD7CMdDKzkJ8jGwwkJBU7jXGIujSMAiSO2o-daL-Gp+0HM8WOdS8qQQ0RtkYLztgcNdlXlJ96ycYTjE-UT-ysijJKTGiZKPJEmNRVilLEFZVKseQJAcN9hNJT8PWWMx62ExdgyMMxIss8jKKIBjYrArkSLihTUsvb15HwCMvL4oppSMdZlQM9QZBwv5ZHlfzLGq-BxJi1lrVtWK9wPCz6uW5Kc3a-NHCyQanG4ry5SXZUJgQkoPzlYqPycWb5rqpbGKk+KWvTeSXJgvMxwQPb8AOrRP2cRhTsrGlKv+nDpVsKwqSq8yHLm6LHoamzpJavtOWc5ivrY2IPO67zfMUVQmy4qka0yKlliUL9v3KRGHtip6VtstbEYRJK2rc-NS2+EothKiwFVLecweWLqFR9etg2MSqW32Yh0D7eAhQslKeZ+gBaJ91L19TRB0xYtYQu8zaIhm418MhcACCANdgn6JlJCWZBsP4ihmT8clmyEmgd772NpmtjHlbEl2cewXbmXispGnyVwVy22wNSAA7xwxRrNu95jB8QthrdUlC2WZhNmnc2Q5MB07S37g2fYlKrkD8HCDAouulP5DZsbKijM5Pt1Tl67Jry98M9CPJuMw3vSVStgw0GthcXewA3w+7kck0fdrMUkrFMKnhM+ApBrLhGraZ0Cq+3n6IznxY31Gw3rFUL4m5wjfatZ5Mb-Y4SPRyAGW6ygDI+hJJWewo1DIlGlDMNS8gk6-gvpvRaqN7bbU1uxOYT4BaSCFkFUWypFz7ShjPeIKlSjn3BJfI0LMr6cl-rEcQPFJDbAjM4YqEZZBnQnK-OYK4bB4JKJ-aytC0FxRHhgx2QcPz-WYWoIon43xkzBgg2QNY+IKHUG+TR8pfZOTTlIwOWI6QAPfLsXYCgZjKkMpOHIBk1LYlYW4NwQA */
  id: 'processor',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    processor: input.processor,
    initialProcessor: input.processor,
    isNew: input.isNew ?? false,
  }),
  initial: 'unresolved',
  states: {
    unresolved: {
      always: [{ target: 'draft', guard: 'isDraft' }, { target: 'persisted' }],
    },
    draft: {
      on: {
        'processor.stage': {
          target: '#staged',
          actions: [{ type: 'updateProcessor' }, { type: 'emitProcessorChange' }],
        },
        'processor.cancel': {
          target: 'deleted',
          actions: [{ type: 'restoreInitialProcessor' }, { type: 'emitProcessorChange' }],
        },
        'processor.change': {
          actions: [
            { type: 'changeProcessor', params: ({ event }) => event },
            { type: 'emitProcessorChange' },
          ],
        },
      },
    },
    staged: {
      id: 'staged',
      initial: 'idle',
      states: {
        idle: {
          on: { 'processor.edit': 'editing' },
        },
        editing: {
          on: {
            'processor.update': {
              target: 'idle',
              actions: [{ type: 'updateProcessor' }, { type: 'emitProcessorChange' }],
            },
            'processor.cancel': {
              target: 'idle',
              actions: [{ type: 'restoreInitialProcessor' }, { type: 'emitProcessorChange' }],
            },
            'processor.delete': '#deleted',
            'processor.change': {
              actions: [
                { type: 'changeProcessor', params: ({ event }) => event },
                { type: 'emitProcessorChange' },
              ],
            },
          },
        },
      },
    },
    persisted: {
      initial: 'idle',
      states: {
        idle: {
          on: { 'processor.edit': 'editing' },
        },
        editing: {
          on: {
            'processor.update': {
              target: 'updated',
              actions: [{ type: 'updateProcessor' }, { type: 'emitProcessorChange' }],
            },
            'processor.cancel': { target: 'idle', actions: [{ type: 'restoreInitialProcessor' }] },
            'processor.delete': '#deleted',
            'processor.change': {
              actions: [
                { type: 'changeProcessor', params: ({ event }) => event },
                { type: 'emitProcessorChange' },
              ],
            },
          },
        },
        updated: {
          initial: 'idle',
          states: {
            idle: {
              on: { 'processor.edit': 'editing' },
            },
            editing: {
              on: {
                'processor.update': {
                  target: 'idle',
                  actions: [{ type: 'updateProcessor' }, { type: 'emitProcessorChange' }],
                },
                'processor.cancel': {
                  target: 'idle',
                  actions: [{ type: 'restoreInitialProcessor' }],
                },
                'processor.delete': '#deleted',
                'processor.change': {
                  actions: [
                    { type: 'changeProcessor', params: ({ event }) => event },
                    { type: 'emitProcessorChange' },
                  ],
                },
              },
            },
          },
        },
      },
    },
    deleted: {
      id: 'deleted',
      type: 'final',
      entry: [{ type: 'emitProcessorDelete' }],
    },
  },
});
