/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { TelemetryConfigProvider } from './telemetry_config_provider';

describe('TelemetryConfigProvider', () => {
  let telemetryConfigProvider: TelemetryConfigProvider;

  beforeEach(() => {
    telemetryConfigProvider = new TelemetryConfigProvider();
  });

  describe('getIsOptedIn()', () => {
    it('returns undefined when object is uninitialized', () => {
      expect(telemetryConfigProvider.getIsOptedIn()).toBe(undefined);
    });

    it.each([true, false])('returns pushed %s value after subscribed', (value) => {
      const observable$ = new Observable<boolean>((subscriber) => {
        subscriber.next(value);
      });

      telemetryConfigProvider.start(observable$);

      expect(telemetryConfigProvider.getIsOptedIn()).toBe(value);
    });
  });

  it('stop() unsubscribes from Observable', async () => {
    const unsubscribeMock = jest.fn();
    const observableMock = {
      subscribe: () => ({
        unsubscribe: unsubscribeMock,
      }),
    } as unknown as Observable<boolean>;

    telemetryConfigProvider.start(observableMock);
    expect(unsubscribeMock).not.toBeCalled();

    telemetryConfigProvider.stop();
    expect(unsubscribeMock).toBeCalled();
  });
});
