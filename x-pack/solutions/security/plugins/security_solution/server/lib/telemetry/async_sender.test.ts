/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';

import type { QueueConfig, IAsyncTelemetryEventsSender } from './async_sender.types';
import {
  DEFAULT_QUEUE_CONFIG,
  DEFAULT_RETRY_CONFIG,
  AsyncTelemetryEventsSender,
} from './async_sender';
import { TelemetryChannel, TelemetryCounter } from './types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  createMockTelemetryReceiver,
  createMockTelemetryPluginSetup,
  createMockTelemetryPluginStart,
  createMockUsageCounter,
} from './__mocks__';
import { TelemetryEventsSender } from './sender';

jest.mock('axios');
jest.mock('./receiver');

describe('AsyncTelemetryEventsSender', () => {
  const mockedAxiosPost = jest.spyOn(axios, 'post');
  const mockedAxiosGet = jest.spyOn(axios, 'get');
  const telemetryPluginSetup = createMockTelemetryPluginSetup();
  const telemetryPluginStart = createMockTelemetryPluginStart();
  const receiver = createMockTelemetryReceiver();
  const telemetryUsageCounter = createMockUsageCounter();
  const ch1 = TelemetryChannel.INSIGHTS;
  const ch2 = TelemetryChannel.LISTS;
  const ch3 = TelemetryChannel.DETECTION_ALERTS;
  const ch1Config: QueueConfig = {
    bufferTimeSpanMillis: 100,
    inflightEventsThreshold: 1000,
    maxPayloadSizeBytes: 10_000,
  };
  const ch2Config: QueueConfig = {
    bufferTimeSpanMillis: 1000,
    inflightEventsThreshold: 500,
    maxPayloadSizeBytes: 10_000,
  };
  const ch3Config: QueueConfig = {
    bufferTimeSpanMillis: 5000,
    inflightEventsThreshold: 10,
    maxPayloadSizeBytes: 10_000,
  };

  let service: IAsyncTelemetryEventsSender;

  beforeEach(() => {
    service = new AsyncTelemetryEventsSender(loggingSystemMock.createLogger());
    jest.useFakeTimers({ advanceTimers: true });
    mockedAxiosPost.mockClear();
    telemetryUsageCounter.incrementCounter.mockClear();
    mockedAxiosPost.mockResolvedValue({ status: 201 });
    mockedAxiosGet.mockResolvedValue({ status: 200 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('uses default configu', async () => {
      const events = ['e1', 'e2', 'e3'];
      const expectedBody = events.map((e) => JSON.stringify(e)).join('\n');

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.start(telemetryPluginStart);

      service.send(ch1, events);
      await jest.advanceTimersByTimeAsync(DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis * 1.1);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        expectedBody,
        expect.anything()
      );

      await service.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });

    it('does not lose data during startup', async () => {
      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);

      const events = ['e1', 'e2', 'e3'];
      const expectedBody = events.map((e) => JSON.stringify(e)).join('\n');

      service.send(ch1, events);

      await jest.advanceTimersByTimeAsync(DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis * 1.1);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(0);

      service.start(telemetryPluginStart);

      await jest.advanceTimersByTimeAsync(DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis * 1.1);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        expectedBody,
        expect.anything()
      );

      await service.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });

    it('should not start without being configured', () => {
      expect(() => {
        service.start(telemetryPluginStart);
      }).toThrow('CREATED: invalid status. Expected [CONFIGURED]');
    });

    it('should not start twice', () => {
      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);

      service.start(telemetryPluginStart);

      expect(() => {
        service.start(telemetryPluginStart);
      }).toThrow('STARTED: invalid status. Expected [CONFIGURED]');
    });

    it('should not send events if the servise is not configured', () => {
      expect(() => {
        service.send(ch1, ['hello']);
      }).toThrow('CREATED: invalid status. Expected [CONFIGURED,STARTED]');
    });
  });

  describe('simple use cases', () => {
    it('should chunk events by size', async () => {
      const events = ['aaaaa', 'b', 'c'];
      const expectedBodies = [
        events
          .slice(0, 2)
          .map((e) => JSON.stringify(e))
          .join('\n'),
        events
          .slice(2)
          .map((e) => JSON.stringify(e))
          .join('\n'),
      ];

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch1, { ...ch1Config, maxPayloadSizeBytes: 10 });
      service.start(telemetryPluginStart);

      // at most 10 bytes per payload (after serialized to JSON): it should send
      // two posts: ["aaaaa", "b"] and ["c"]
      service.send(ch1, events);

      await service.stop();

      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);

      expectedBodies.forEach((expectedBody) => {
        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.anything(),
          expectedBody,
          expect.anything()
        );
      });
    });

    it('should chunk events by size, even if one event is bigger than `maxTelemetryPayloadSizeBytes`', async () => {
      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch1, { ...ch1Config, maxPayloadSizeBytes: 3 });
      service.start(telemetryPluginStart);

      // at most 10 bytes per payload (after serialized to JSON): it should
      // send two posts: ["aaaaa", "b"] and ["c"]
      const events = ['aaaaa', 'b', 'c'];
      const expectedBodies = [
        events
          .slice(0, 1)
          .map((e) => JSON.stringify(e))
          .join('\n'),
        events
          .slice(1, 2)
          .map((e) => JSON.stringify(e))
          .join('\n'),
        events
          .slice(2)
          .map((e) => JSON.stringify(e))
          .join('\n'),
      ];

      service.send(ch1, events);

      await service.stop();

      expect(mockedAxiosPost).toHaveBeenCalledTimes(3);

      expectedBodies.forEach((expectedBody) => {
        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.anything(),
          expectedBody,
          expect.anything()
        );
      });
    });

    it('should buffer for a specific time period', async () => {
      const bufferTimeSpanMillis = 2000;

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch1, { ...ch1Config, bufferTimeSpanMillis });
      service.start(telemetryPluginStart);

      const events = ['a', 'b', 'c'];
      const expectedBody = events.map((e) => JSON.stringify(e)).join('\n');

      // send some events
      service.send(ch1, events);

      // advance time by less than the buffer time span
      await jest.advanceTimersByTimeAsync(bufferTimeSpanMillis * 0.2);

      // check that no events are sent before the buffer time span
      expect(mockedAxiosPost).toHaveBeenCalledTimes(0);

      // advance time by more than the buffer time span
      await jest.advanceTimersByTimeAsync(bufferTimeSpanMillis * 1.2);

      // check that the events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        expectedBody,
        expect.anything()
      );

      await service.stop();

      // check that no more events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('retries when the backend fails', async () => {
      mockedAxiosPost
        .mockReturnValueOnce(Promise.resolve({ status: 500 }))
        .mockReturnValueOnce(Promise.resolve({ status: 500 }))
        .mockReturnValue(Promise.resolve({ status: 201 }));

      const bufferTimeSpanMillis = 3;

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch1, { ...ch1Config, bufferTimeSpanMillis });
      service.start(telemetryPluginStart);

      // send some events
      service.send(ch1, ['a']);

      // advance time by more than the retry delay for all the retries
      await jest.advanceTimersByTimeAsync(
        DEFAULT_RETRY_CONFIG.retryCount * DEFAULT_RETRY_CONFIG.retryDelayMillis
      );

      // check that the events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.retryCount);

      await service.stop();

      // check that no more events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.retryCount);
    });

    it('retries runtime errors', async () => {
      mockedAxiosPost
        .mockReturnValueOnce(Promise.resolve({ status: 500 }))
        .mockReturnValueOnce(Promise.resolve({ status: 500 }))
        .mockReturnValue(Promise.resolve({ status: 201 }));

      const bufferTimeSpanMillis = 3;

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch1, { ...ch1Config, bufferTimeSpanMillis });
      service.start(telemetryPluginStart);

      // send some events
      service.send(ch1, ['a']);

      // advance time by more than the retry delay for all the retries
      await jest.advanceTimersByTimeAsync(
        DEFAULT_RETRY_CONFIG.retryCount * DEFAULT_RETRY_CONFIG.retryDelayMillis
      );

      // check that the events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.retryCount);

      await service.stop();

      // check that no more events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.retryCount);
    });

    it('only retries `retryCount` times', async () => {
      mockedAxiosPost.mockReturnValue(Promise.resolve({ status: 500 }));
      const bufferTimeSpanMillis = 100;

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch1, { ...ch1Config, bufferTimeSpanMillis });
      service.start(telemetryPluginStart);

      // send some events
      service.send(ch1, ['a']);

      // advance time by more than the buffer time span
      await jest.advanceTimersByTimeAsync(
        (DEFAULT_RETRY_CONFIG.retryCount + 1) * DEFAULT_RETRY_CONFIG.retryDelayMillis * 1.2
      );

      // check that the events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.retryCount + 1);

      await service.stop();

      // check that no more events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.retryCount + 1);
    });

    it('should catch fatal errors', async () => {
      mockedAxiosPost.mockImplementation(() => {
        throw Error('fatal error');
      });
      const bufferTimeSpanMillis = 100;

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch1, { ...ch1Config, bufferTimeSpanMillis });
      service.start(telemetryPluginStart);

      // send some events
      service.send(ch1, ['a']);

      // advance time by more than the buffer time span
      await jest.advanceTimersByTimeAsync(
        (DEFAULT_RETRY_CONFIG.retryCount + 1) * DEFAULT_RETRY_CONFIG.retryDelayMillis * 1.2
      );

      // check that the events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.retryCount + 1);

      await service.stop();

      // check that no more events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.retryCount + 1);
    });
  });

  describe('throttling', () => {
    it('drop events above inflightEventsThreshold', async () => {
      const inflightEventsThreshold = 3;
      const bufferTimeSpanMillis = 2000;

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch1, {
        ...ch1Config,
        bufferTimeSpanMillis,
        inflightEventsThreshold,
      });
      service.start(telemetryPluginStart);

      // send five events
      service.send(ch1, ['a', 'b', 'c', 'd']);

      // check that no events are sent before the buffer time span
      expect(mockedAxiosPost).toHaveBeenCalledTimes(0);

      // advance time
      await jest.advanceTimersByTimeAsync(bufferTimeSpanMillis * 2);

      // check that only `inflightEventsThreshold` events were sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        '"a"\n"b"\n"c"',
        expect.anything()
      );

      await service.stop();

      // check that no more events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });

    it('do not drop events if they are processed before the next batch', async () => {
      const batches = 3;
      const inflightEventsThreshold = 3;
      const bufferTimeSpanMillis = 2000;

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch1, {
        ...ch1Config,
        bufferTimeSpanMillis,
        inflightEventsThreshold,
      });

      service.start(telemetryPluginStart);

      // check that no events are sent before the buffer time span
      expect(mockedAxiosPost).toHaveBeenCalledTimes(0);

      for (let i = 0; i < batches; i++) {
        // send the next batch
        service.send(ch1, ['a', 'b', 'c']);

        // advance time
        await jest.advanceTimersByTimeAsync(bufferTimeSpanMillis * 2);
      }

      expect(mockedAxiosPost).toHaveBeenCalledTimes(batches);
      for (let i = 0; i < batches; i++) {
        const expected = '"a"\n"b"\n"c"';

        expect(mockedAxiosPost).toHaveBeenNthCalledWith(
          i + 1,
          expect.anything(),
          expected,
          expect.anything()
        );
      }

      await service.stop();

      // check that no more events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(batches);
    });
  });

  describe('priority queues', () => {
    it('manage multiple queues for a single channel', async () => {
      const ch1Events = ['high-a', 'high-b', 'high-c', 'high-d'];
      const ch2Events = ['med-a', 'med-b', 'med-c', 'med-d'];
      const ch3Events = ['low-a', 'low-b', 'low-c', 'low-d'];

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch1, ch1Config);
      service.updateQueueConfig(ch2, ch2Config);
      service.updateQueueConfig(ch3, ch3Config);
      service.start(telemetryPluginStart);

      // send low-priority events
      service.send(ch3, ch3Events.slice(0, 2));

      // wait less than low priority latency
      await jest.advanceTimersByTimeAsync(ch2Config.bufferTimeSpanMillis);

      // send more low-priority events
      service.send(ch3, ch3Events.slice(2, ch3Events.length));

      // also send mid-priority events
      service.send(ch2, ch2Events);

      // and finally send some high-priority events
      service.send(ch1, ch1Events);

      // wait a little bit, just the high priority queue latency
      await jest.advanceTimersByTimeAsync(ch1Config.bufferTimeSpanMillis);

      // only high priority events should have been sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        ch1Events.map((e) => JSON.stringify(e)).join('\n'),
        expect.anything()
      );

      // wait just the medium priority queue latency
      await jest.advanceTimersByTimeAsync(ch2Config.bufferTimeSpanMillis);

      // only medium priority events should have been sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
      expect(mockedAxiosPost).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        ch2Events.map((e) => JSON.stringify(e)).join('\n'),
        expect.anything()
      );

      // wait more time
      await jest.advanceTimersByTimeAsync(ch3Config.bufferTimeSpanMillis);

      // all events should have been sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(3);
      expect(mockedAxiosPost).toHaveBeenNthCalledWith(
        3,
        expect.anything(),
        ch3Events.map((e) => JSON.stringify(e)).join('\n'),
        expect.anything()
      );

      // no more events sent after the service was stopped
      await service.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(3);
    });

    it('discard events when inflightEventsThreshold is reached and process other queues', async () => {
      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch2, ch2Config);
      service.updateQueueConfig(ch3, ch3Config);
      service.start(telemetryPluginStart);

      const ch2Events = Array.from(
        { length: ch2Config.inflightEventsThreshold },
        (_, i) => `ch2-${i}`
      );
      // double the inflightEventsThreshold for ch3 events, the service should drop half of them
      const ch3Events = Array.from(
        { length: ch3Config.inflightEventsThreshold * 2 },
        (_, i) => `ch3-${i}`
      );

      service.send(ch3, ch3Events);
      service.send(ch2, ch2Events);

      await jest.advanceTimersByTimeAsync(ch2Config.bufferTimeSpanMillis * 1.2);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(ch3Config.bufferTimeSpanMillis * 1.2);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);

      expect(mockedAxiosPost).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        // gets all ch2 events
        ch2Events.map((e) => JSON.stringify(e)).join('\n'),
        expect.anything()
      );
      expect(mockedAxiosPost).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        // only got `inflightEventsThreshold` events, the remaining ch3 events were dropped
        ch3Events
          .slice(0, ch3Config.inflightEventsThreshold)
          .map((e) => JSON.stringify(e))
          .join('\n'),
        expect.anything()
      );

      await service.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
    });

    it('should manage queue priorities and channels', async () => {
      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(ch2, ch2Config);
      service.updateQueueConfig(ch3, ch3Config);
      service.start(telemetryPluginStart);

      const cases = [
        {
          events: ['ch3-1', 'ch3-2'],
          channel: ch3,
          wait: ch3Config.bufferTimeSpanMillis * 0.2,
        },
        {
          events: ['ch2-1', 'ch2-2', 'ch2-3'],
          channel: ch2,
          wait: ch2Config.bufferTimeSpanMillis * 0.3,
        },
        {
          events: ['ch2-4', 'ch2-5'],
          channel: ch2,
          wait: ch2Config.bufferTimeSpanMillis * 0.9,
        },
        {
          events: ['ch2-6', 'ch2-7', 'ch2-8'],
          channel: ch2,
          wait: ch2Config.bufferTimeSpanMillis * 0.2,
        },
        {
          events: ['ch3-3', 'ch3-4', 'ch3-5'],
          channel: ch3,
          wait: ch3Config.bufferTimeSpanMillis * 1.1,
        },
      ];

      for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];

        service.send(testCase.channel, testCase.events);
        await jest.advanceTimersByTimeAsync(testCase.wait);
      }

      expect(mockedAxiosPost).toHaveBeenCalledTimes(3);

      expect(mockedAxiosPost).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(`.*${ch2}.*`), // url contains the channel name
        [...cases[1].events, ...cases[2].events].map((e) => JSON.stringify(e)).join('\n'),
        expect.anything()
      );

      expect(mockedAxiosPost).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(`.*${ch2}.*`), // url contains the channel name
        cases[3].events.map((e) => JSON.stringify(e)).join('\n'),
        expect.anything()
      );

      expect(mockedAxiosPost).toHaveBeenNthCalledWith(
        3,
        expect.stringMatching(`.*${ch3}.*`), // url contains the channel name
        [...cases[0].events, ...cases[4].events].map((e) => JSON.stringify(e)).join('\n'),
        expect.anything()
      );

      await service.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(3);
    });
  });

  describe('dynamic configuration', () => {
    it('should update default queue config', async () => {
      const initialTimeSpan = DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis;
      const bufferTimeSpanMillis = initialTimeSpan * 10;
      const events = ['e1', 'e2', 'e3'];
      const expectedBody = events.map((e) => JSON.stringify(e)).join('\n');

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.start(telemetryPluginStart);

      service.updateDefaultQueueConfig({ ...DEFAULT_QUEUE_CONFIG, bufferTimeSpanMillis });

      // send data and wait the initial time span
      service.send(ch1, events);
      await jest.advanceTimersByTimeAsync(initialTimeSpan * 1.1);
      expect(mockedAxiosPost).toHaveBeenCalledTimes(0);

      // wait the new timespan, now we should have data
      await jest.advanceTimersByTimeAsync(bufferTimeSpanMillis * 1.1);
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        expectedBody,
        expect.anything()
      );

      await service.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });

    it('should update buffer time config dinamically', async () => {
      const channel = TelemetryChannel.DETECTION_ALERTS;
      const bufferTimeSpanMillis = 5001;
      const detectionAlertsAfter = {
        ...ch1Config,
        bufferTimeSpanMillis,
      };
      const events = ['a', 'b', 'c'];
      const expectedBody = events.map((e) => JSON.stringify(e)).join('\n');

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(channel, ch1Config);
      service.start(telemetryPluginStart);

      service.send(channel, events);

      await jest.advanceTimersByTimeAsync(ch1Config.bufferTimeSpanMillis * 1.1);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        expectedBody,
        expect.anything()
      );

      service.updateQueueConfig(channel, detectionAlertsAfter);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);

      service.send(channel, events);
      // the old buffer time shouldn't trigger a new buffer (we increased it)
      await jest.advanceTimersByTimeAsync(ch1Config.bufferTimeSpanMillis * 1.1);
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);

      // wait more time...
      await jest.advanceTimersByTimeAsync(detectionAlertsAfter.bufferTimeSpanMillis);
      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        expectedBody,
        expect.anything()
      );

      await service.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
    });

    it('should update max payload size dinamically', async () => {
      const channel = TelemetryChannel.DETECTION_ALERTS;
      const detectionAlertsBefore = {
        bufferTimeSpanMillis: 1000,
        inflightEventsThreshold: 10,
        maxPayloadSizeBytes: 10,
      };
      const detectionAlertsAfter = {
        ...detectionAlertsBefore,
        maxPayloadSizeBytes: 10_000,
      };

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(channel, detectionAlertsBefore);
      service.start(telemetryPluginStart);

      service.send(channel, ['aaaaa', 'b', 'c']);
      let expectedBodies = ['"aaaaa"\n"b"', '"c"'];

      await jest.advanceTimersByTimeAsync(detectionAlertsBefore.bufferTimeSpanMillis * 1.1);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
      expectedBodies.forEach((expectedBody) => {
        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.anything(),
          expectedBody,
          expect.anything()
        );
      });

      service.updateQueueConfig(channel, detectionAlertsAfter);

      service.send(channel, ['aaaaa', 'b', 'c']);
      expectedBodies = ['"aaaaa"\n"b"\n"c"'];

      await jest.advanceTimersByTimeAsync(detectionAlertsAfter.bufferTimeSpanMillis * 1.1);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(3);
      expectedBodies.forEach((expectedBody) => {
        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.anything(),
          expectedBody,
          expect.anything()
        );
      });

      await service.stop();
    });

    it('should configure a new queue', async () => {
      const bufferTimeSpanMillis = DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis * 10;
      const events = ['a', 'b', 'c'];
      const expectedBody = events.map((e) => JSON.stringify(e)).join('\n');

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.start(telemetryPluginStart);

      service.send(ch1, events);

      await jest.advanceTimersByTimeAsync(DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis * 1.1);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        expectedBody,
        expect.anything()
      );

      service.updateQueueConfig(ch1, { ...DEFAULT_QUEUE_CONFIG, bufferTimeSpanMillis });

      service.send(ch1, events);

      await jest.advanceTimersByTimeAsync(DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis * 1.1);
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(bufferTimeSpanMillis * 1.1);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        expectedBody,
        expect.anything()
      );

      await service.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
    });
  });

  describe('http headers', () => {
    it('should add X-Telemetry-Sender header', async () => {
      service.setup(
        DEFAULT_RETRY_CONFIG,
        DEFAULT_QUEUE_CONFIG,
        receiver,
        telemetryPluginSetup,
        telemetryUsageCounter
      );
      service.start(telemetryPluginStart);

      service.send(ch1, ['a']);
      await service.stop();

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      const found = mockedAxiosPost.mock.calls.some(
        ([_url, _body, config]) =>
          config && config.headers && config.headers['X-Telemetry-Sender'] === 'async'
      );

      expect(found).not.toBeFalsy();
    });
  });

  describe('usage counter', () => {
    it('should increment the counter when sending events ok', async () => {
      service.setup(
        DEFAULT_RETRY_CONFIG,
        DEFAULT_QUEUE_CONFIG,
        receiver,
        telemetryPluginSetup,
        telemetryUsageCounter
      );
      service.start(telemetryPluginStart);

      service.send(ch1, ['a', 'b', 'c']);
      await service.stop();

      const found = telemetryUsageCounter.incrementCounter.mock.calls.some(
        ([param]) => param.counterType === TelemetryCounter.DOCS_SENT && param.incrementBy === 3
      );
      expect(found).not.toBeFalsy();
    });

    it('should increment the counter when sending events with errors', async () => {
      mockedAxiosPost.mockReturnValue(Promise.resolve({ status: 500 }));

      service.setup(
        DEFAULT_RETRY_CONFIG,
        DEFAULT_QUEUE_CONFIG,
        receiver,
        telemetryPluginSetup,
        telemetryUsageCounter
      );
      service.updateQueueConfig(ch1, ch1Config);
      service.updateQueueConfig(ch2, ch2Config);
      service.updateQueueConfig(ch3, ch3Config);
      service.start(telemetryPluginStart);

      service.send(ch1, ['a', 'b', 'c']);
      await service.stop();

      const found = telemetryUsageCounter.incrementCounter.mock.calls.some(
        ([param]) => param.counterType === TelemetryCounter.DOCS_LOST && param.incrementBy === 3
      );
      expect(found).not.toBeFalsy();
    });

    it('should increment the counter when sending events with errors and without errors', async () => {
      // retries count is set to 3
      mockedAxiosPost
        .mockReturnValueOnce(Promise.resolve({ status: 500 }))
        .mockReturnValueOnce(Promise.resolve({ status: 500 }))
        .mockReturnValueOnce(Promise.resolve({ status: 500 }))
        .mockReturnValueOnce(Promise.resolve({ status: 500 }));

      service.setup(
        DEFAULT_RETRY_CONFIG,
        DEFAULT_QUEUE_CONFIG,
        receiver,
        telemetryPluginSetup,
        telemetryUsageCounter
      );
      service.updateQueueConfig(ch1, ch1Config);
      service.updateQueueConfig(ch2, ch2Config);
      service.updateQueueConfig(ch3, ch3Config);
      service.start(telemetryPluginStart);

      service.send(ch1, ['a', 'b', 'c']);
      await jest.advanceTimersByTimeAsync(ch1Config.bufferTimeSpanMillis * 1.1);
      service.send(ch1, ['a', 'b']);
      await service.stop();

      const foundLost = telemetryUsageCounter.incrementCounter.mock.calls.some(
        ([param]) => param.counterType === TelemetryCounter.DOCS_LOST && param.incrementBy === 3
      );
      expect(foundLost).not.toBeFalsy();

      const foundSent = telemetryUsageCounter.incrementCounter.mock.calls.some(
        ([param]) => param.counterType === TelemetryCounter.DOCS_SENT && param.incrementBy === 2
      );
      expect(foundSent).not.toBeFalsy();
    });

    it('should increment the counter when drops events', async () => {
      const inflightEventsThreshold = 3;
      const bufferTimeSpanMillis = 2000;

      service.setup(
        DEFAULT_RETRY_CONFIG,
        DEFAULT_QUEUE_CONFIG,
        receiver,
        telemetryPluginSetup,
        telemetryUsageCounter
      );
      service.updateQueueConfig(ch1, {
        ...ch1Config,
        bufferTimeSpanMillis,
        inflightEventsThreshold,
      });
      service.start(telemetryPluginStart);

      // send five events
      service.send(ch1, ['a', 'b', 'c', 'd']);

      // check that no events are sent before the buffer time span
      expect(mockedAxiosPost).toHaveBeenCalledTimes(0);

      // advance time
      await jest.advanceTimersByTimeAsync(bufferTimeSpanMillis * 2);

      // check that only `inflightEventsThreshold` events were sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        '"a"\n"b"\n"c"',
        expect.anything()
      );

      const found = telemetryUsageCounter.incrementCounter.mock.calls.some(
        ([param]) => param.counterType === TelemetryCounter.DOCS_DROPPED && param.incrementBy === 1
      );
      expect(found).not.toBeFalsy();

      await service.stop();

      // check that no more events are sent
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });

    it('should increment runtime error counter for expected errors', async () => {
      mockedAxiosPost.mockReturnValue(Promise.resolve({ status: 401 }));

      service.setup(
        DEFAULT_RETRY_CONFIG,
        DEFAULT_QUEUE_CONFIG,
        receiver,
        telemetryPluginSetup,
        telemetryUsageCounter
      );

      service.start(telemetryPluginStart);

      service.send(ch1, ['a']);

      await jest.advanceTimersByTimeAsync(DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis * 10);
      await service.stop();

      const foundFatal = telemetryUsageCounter.incrementCounter.mock.calls.some(
        ([param]) => param.counterType === TelemetryCounter.FATAL_ERROR && param.incrementBy === 1
      );
      expect(foundFatal).toBeFalsy();

      const foundRuntime = telemetryUsageCounter.incrementCounter.mock.calls.some(
        ([param]) => param.counterType === TelemetryCounter.RUNTIME_ERROR && param.incrementBy === 1
      );
      expect(foundRuntime).not.toBeFalsy();
    });

    it('should increment fatal error counter when applies', async () => {
      mockedAxiosPost.mockImplementation(() => {
        throw Error('fatal error');
      });

      service.setup(
        DEFAULT_RETRY_CONFIG,
        DEFAULT_QUEUE_CONFIG,
        receiver,
        telemetryPluginSetup,
        telemetryUsageCounter
      );

      service.start(telemetryPluginStart);

      service.send(ch1, ['a']);

      await jest.advanceTimersByTimeAsync(DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis * 10);
      await service.stop();

      const foundFatal = telemetryUsageCounter.incrementCounter.mock.calls.some(
        ([param]) => param.counterType === TelemetryCounter.FATAL_ERROR && param.incrementBy === 1
      );
      expect(foundFatal).not.toBeFalsy();

      const foundRuntime = telemetryUsageCounter.incrementCounter.mock.calls.some(
        ([param]) => param.counterType === TelemetryCounter.RUNTIME_ERROR && param.incrementBy === 1
      );
      expect(foundRuntime).toBeFalsy();
    });
  });

  describe('ITelemetryEventsSender integration', () => {
    it('should send events using the async service', async () => {
      const serviceV1 = new TelemetryEventsSender(loggingSystemMock.createLogger());

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.start(telemetryPluginStart);

      serviceV1.setup(receiver, telemetryPluginSetup, undefined, telemetryUsageCounter, service);

      const events = ['a', 'b', 'c'];
      const expectedBody = events.map((e) => JSON.stringify(e)).join('\n');

      serviceV1.sendAsync(ch1, events);

      await jest.advanceTimersByTimeAsync(DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis * 1.1);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        expectedBody,
        expect.anything()
      );

      await service.stop();
      serviceV1.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });

    it('should configure the default queue config in the async service', async () => {
      const initialTimeSpan = DEFAULT_QUEUE_CONFIG.bufferTimeSpanMillis;
      const bufferTimeSpanMillis = initialTimeSpan * 10;
      const events = ['e1', 'e2', 'e3'];
      const expectedBody = events.map((e) => JSON.stringify(e)).join('\n');
      const serviceV1 = new TelemetryEventsSender(loggingSystemMock.createLogger());

      serviceV1.setup(receiver, telemetryPluginSetup, undefined, telemetryUsageCounter, service);

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.start(telemetryPluginStart);

      serviceV1.updateDefaultQueueConfig({ ...DEFAULT_QUEUE_CONFIG, bufferTimeSpanMillis });

      // send data and wait the initial time span
      serviceV1.sendAsync(ch1, events);
      await jest.advanceTimersByTimeAsync(initialTimeSpan * 1.1);
      expect(mockedAxiosPost).toHaveBeenCalledTimes(0);

      // wait the new timespan, now we should have data
      await jest.advanceTimersByTimeAsync(bufferTimeSpanMillis * 1.1);
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.anything(),
        expectedBody,
        expect.anything()
      );

      await service.stop();
      serviceV1.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
    });

    it('should configure a queue config in the async service', async () => {
      const channel = TelemetryChannel.DETECTION_ALERTS;
      const detectionAlertsBefore = {
        bufferTimeSpanMillis: 900,
        inflightEventsThreshold: 10,
        maxPayloadSizeBytes: 10_000,
      };
      const detectionAlertsAfter = {
        ...detectionAlertsBefore,
        bufferTimeSpanMillis: 5001,
      };
      const serviceV1 = new TelemetryEventsSender(loggingSystemMock.createLogger());

      serviceV1.setup(receiver, telemetryPluginSetup, undefined, telemetryUsageCounter, service);

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.updateQueueConfig(channel, detectionAlertsBefore);
      service.start(telemetryPluginStart);

      serviceV1.sendAsync(channel, ['a', 'b', 'c']);
      const expectedBodies = ['"a"\n"b"\n"c"'];

      await jest.advanceTimersByTimeAsync(detectionAlertsBefore.bufferTimeSpanMillis * 1.1);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
      expectedBodies.forEach((expectedBody) => {
        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.anything(),
          expectedBody,
          expect.anything()
        );
      });

      serviceV1.updateQueueConfig(channel, detectionAlertsAfter);

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);

      serviceV1.sendAsync(channel, ['a', 'b', 'c']);
      // the old buffer time shouldn't trigger a new buffer (we increased it)
      await jest.advanceTimersByTimeAsync(detectionAlertsBefore.bufferTimeSpanMillis * 1.1);
      expect(mockedAxiosPost).toHaveBeenCalledTimes(1);

      // wait more time...
      await jest.advanceTimersByTimeAsync(detectionAlertsAfter.bufferTimeSpanMillis);
      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);

      expectedBodies.forEach((expectedBody) => {
        expect(mockedAxiosPost).toHaveBeenCalledWith(
          expect.anything(),
          expectedBody,
          expect.anything()
        );
      });

      await service.stop();
      serviceV1.stop();
      expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
    });
  });

  describe('simulateSend', () => {
    it('should send events using the async service', async () => {
      jest.useRealTimers();
      const events = ['a', 'b', 'c'];
      const expectedResult = events.map((e) => JSON.stringify(e));

      service.setup(DEFAULT_RETRY_CONFIG, DEFAULT_QUEUE_CONFIG, receiver, telemetryPluginSetup);
      service.start(telemetryPluginStart);

      const result = service.simulateSend(ch1, events);

      await service.stop();

      // no events sent to the telemetry service
      expect(mockedAxiosPost).toHaveBeenCalledTimes(0);

      expect(result).toEqual(expectedResult);
    });
  });
});
