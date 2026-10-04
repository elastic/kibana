/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Lines that are never executable logging emissions. */
const unconditionalNonEmittingPatterns: readonly RegExp[] = [
  /^[ \t]*(import|use|require|from|#include)[ (]/,
  /^[ \t]*(\/\/|#|\*|\/\*|--)/,
];

/** Constructs that only become non-emitting when the same line has no log call. */
const nonEmittingUnlessCalledPatterns: readonly RegExp[] = [
  /is(Debug|Info|Warn|Trace|Error)Enabled|IsEnabled[(]|LevelEnabled|isHandling[(]/,
  /#\[tracing::instrument|@Slf4j|@Log[( ]|\[LoggerMessage/,
  /(info|debug|error|warn)_span!|[.]instrument[(]|tracing::Span/,
  /LoggerFactory[.]getLogger[(]|[ .]getLogger[(]|NewNopLogger|new Logger[(]|Logger[.]new|slog[.]New|zap[.]New/,
  /Logger[.]metadata[(]|[.]setLevel[(]|Logger[.]configure|put_process_level/,
  /fmt[.]Errorf[(]|errors[.]New[(]|status[.]Errorf[(]|httpgrpc[.]Errorf[(]|xerrors[.]/,
];

/** Calls that prove the matched line can emit despite setup-like text. */
const emittingCallPattern: RegExp =
  /[.](info|Info|error|Error|warn|Warn|warning|Warning|debug|Debug|fatal|Fatal|critical|Critical|exception|Exception|log|Log|Msg|Msgf|print|Print|println|Println)[(]|panic[!(]|[ (]println[ (]|fprintf[(]stderr|eprintln/;

/** Returns whether only the matched source line is known not to emit a message. */
export const isNonEmittingLoggingLine = (line: string): boolean => {
  if (unconditionalNonEmittingPatterns.some((pattern) => pattern.test(line))) return true;
  // Nearby declarations and guards must not suppress a real multi-line call.
  if (emittingCallPattern.test(line)) return false;
  return nonEmittingUnlessCalledPatterns.some((pattern) => pattern.test(line));
};
