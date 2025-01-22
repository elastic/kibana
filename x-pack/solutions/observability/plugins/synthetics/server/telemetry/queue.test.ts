/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable dot-notation */
import { TelemetryQueue } from './queue';

describe('TelemetryQueue', () => {
  describe('queueTelemetryEvents', () => {
    it('queues two events', () => {
      const queue = new TelemetryQueue();
      queue.addEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }]);
      expect(queue['queue'].length).toBe(2);
    });

    it('queues more than maxQueueSize events', () => {
      const queue = new TelemetryQueue();
      queue.addEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }]);
      queue['maxQueueSize'] = 5;
      queue.addEvents([{ 'event.kind': '3' }, { 'event.kind': '4' }]);
      queue.addEvents([{ 'event.kind': '5' }, { 'event.kind': '6' }]);
      queue.addEvents([{ 'event.kind': '7' }, { 'event.kind': '8' }]);
      expect(queue['queue'].length).toBe(5);
    });

    it('get and clear events', async () => {
      const queue = new TelemetryQueue();
      queue.addEvents([{ 'event.kind': '1' }, { 'event.kind': '2' }]);

      expect(queue.getEvents().length).toBe(2);

      queue.clearEvents();

      expect(queue['queue'].length).toBe(0);
    });
  });
});
