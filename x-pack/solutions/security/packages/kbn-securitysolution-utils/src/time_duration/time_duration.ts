/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Provides a convenient way to manipulate a time duration.
 *
 * Time duration is stored as a string in Security Solution, e.g.
 * - 5s
 * - 3m
 * - 7h
 */
export class TimeDuration {
  /**
   * Constructs a time duration from milliseconds. The output is normalized.
   */
  static fromMilliseconds(ms: number): TimeDuration {
    return new TimeDuration(Math.round(ms / 1000), 's').toNormalizedTimeDuration();
  }

  /*
   * Parses a duration string and returns value and units. The output is normalized.
   * Returns `undefined` when unable to parse.
   *
   * Recognizes
   *  - seconds (e.g. 2s)
   *  - minutes (e.g. 5m)
   *  - hours (e.g. 7h)
   *  - days (e.g. 9d)
   */
  static parse(input: string): TimeDuration | undefined {
    if (typeof input !== 'string') {
      return undefined;
    }

    const matchArray = input.match(TIME_DURATION_REGEX);

    if (!matchArray) {
      return undefined;
    }

    const value = parseInt(matchArray[1], 10);
    const unit = matchArray[2] as TimeDuration['unit'];

    return new TimeDuration(value, unit).toNormalizedTimeDuration();
  }

  constructor(public value: number, public unit: TimeDurationUnits) {}

  /**
   * Convert time duration to milliseconds.
   * Supports
   *  - `s` seconds, e.g. 3s, 0s, -5s
   *  - `m` minutes, e.g. 10m, 0m
   *  - `h` hours, e.g. 7h
   *  - `d` days, e.g. 3d
   *
   * Returns `undefined` when unable to perform conversion.
   */
  toMilliseconds(): number {
    switch (this.unit) {
      case 's':
        return this.value * 1000;
      case 'm':
        return this.value * 1000 * 60;
      case 'h':
        return this.value * 1000 * 60 * 60;
      case 'd':
        return this.value * 1000 * 60 * 60 * 24;
    }
  }

  /**
   * Converts time duration to the largest possible units. E.g.
   * - 60s transformed to 1m
   * - 3600s transformed to 1h
   * - 1440m transformed to 1d
   */
  toNormalizedTimeDuration(): TimeDuration {
    const ms = this.toMilliseconds();

    if (ms === undefined) {
      return this;
    }

    if (ms === 0) {
      return new TimeDuration(0, 's');
    }

    if (ms % (3600000 * 24) === 0) {
      return new TimeDuration(ms / (3600000 * 24), 'd');
    }

    if (ms % 3600000 === 0) {
      return new TimeDuration(ms / 3600000, 'h');
    }

    if (ms % 60000 === 0) {
      return new TimeDuration(ms / 60000, 'm');
    }

    if (ms % 1000 === 0) {
      return new TimeDuration(ms / 1000, 's');
    }

    return this;
  }

  toString(): string {
    return `${this.value}${this.unit}`;
  }
}

const TimeDurationUnits = ['s', 'm', 'h', 'd'] as const;
type TimeDurationUnits = (typeof TimeDurationUnits)[number];

const TIME_DURATION_REGEX = new RegExp(`^((?:\\-|\\+)?[0-9]+)(${TimeDurationUnits.join('|')})$`);
