/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMessageSource, LogMeta, LogRecord, Logger } from '@kbn/logging';

/**
 * Marker stamped on every PND server log message, mirroring Attack Discovery's `[kibana-dkv]`.
 *
 * The README documents `grep -a '[kibana-pnd]' <log>` as *the* way to debug this plugin, but the
 * marker appeared **zero** times in PND server source against 32 `logger.*` call sites (finding
 * R3), so that instruction could never match anything.
 */
export const PND_LOG_PREFIX = '[kibana-pnd]' as const;

/**
 * Stamp {@link PND_LOG_PREFIX} on a message.
 *
 * Idempotent: a message that already carries the marker is returned unchanged, so a call site that
 * spells the prefix out (or a logger that is wrapped twice) never produces `[kibana-pnd]
 * [kibana-pnd] …`.
 */
export const withPndLogPrefix = (message: string): string =>
  message.startsWith(PND_LOG_PREFIX) ? message : `${PND_LOG_PREFIX} ${message}`;

/**
 * Stamp the marker on a message source **without collapsing the lazy form**.
 *
 * `logger.debug(() => …)` exists so the template is never built when debug logging is off. Wrapping
 * the thunk in another thunk preserves that; interpolating it into a template here would defeat it.
 */
const prefixMessageSource = (message: LogMessageSource): LogMessageSource =>
  typeof message === 'function' ? () => withPndLogPrefix(message()) : withPndLogPrefix(message);

/**
 * `warn` / `error` / `fatal` also accept an `Error`, which is forwarded **untouched**: the appender
 * renders the error's own `message` and `stack`, and rebuilding it to insert a prefix would falsify
 * the stack. PND has no `Error`-valued call site today; prefer a string message so the marker
 * survives.
 */
const prefixErrorOrMessageSource = (
  errorOrMessage: LogMessageSource | Error
): LogMessageSource | Error =>
  errorOrMessage instanceof Error ? errorOrMessage : prefixMessageSource(errorOrMessage);

/**
 * Wrap a {@link Logger} so every message it emits carries {@link PND_LOG_PREFIX}.
 *
 * Applied **once**, in the plugin constructor, to the single logger the PND server hands to every
 * route, service, and helper. That is deliberate: a per-call-site helper can be forgotten by the
 * next route that is written, whereas nothing a call site does can drop the marker here. Child
 * loggers obtained with `get()` are wrapped too.
 *
 * A PND logger obtained from anywhere other than the plugin constructor bypasses this — do not
 * reach for `coreSetup`/`PluginInitializerContext` logging directly.
 */
export const createPndLogger = (logger: Logger): Logger => ({
  debug: (message: LogMessageSource, meta?: LogMeta) =>
    logger.debug(prefixMessageSource(message), meta),
  error: (errorOrMessage: LogMessageSource | Error, meta?: LogMeta) =>
    logger.error(prefixErrorOrMessageSource(errorOrMessage), meta),
  fatal: (errorOrMessage: LogMessageSource | Error, meta?: LogMeta) =>
    logger.fatal(prefixErrorOrMessageSource(errorOrMessage), meta),
  get: (...childContextPaths: string[]) => createPndLogger(logger.get(...childContextPaths)),
  info: (message: LogMessageSource, meta?: LogMeta) =>
    logger.info(prefixMessageSource(message), meta),
  isLevelEnabled: (level) => logger.isLevelEnabled(level),
  log: (record: LogRecord) => logger.log({ ...record, message: withPndLogPrefix(record.message) }),
  trace: (message: LogMessageSource, meta?: LogMeta) =>
    logger.trace(prefixMessageSource(message), meta),
  warn: (errorOrMessage: LogMessageSource | Error, meta?: LogMeta) =>
    logger.warn(prefixErrorOrMessageSource(errorOrMessage), meta),
});
