/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Standard Git-grep ERE patterns for production logging idioms. */
export const loggingIdiomPatterns: readonly string[] = [
  '[lL]og(ger|ging)?[.]([iI]nfo|[eE]rror|[eE]xception|[wW]arn(ing)?|[dD]ebug|[tT]race|[fF]atal|[cC]ritical|[pP]rint)(f|ln)?',
  '(this|self)[.][lL]og(ger)?[.](info|warn(ing)?|error|debug|trace|fatal)',
  'console[.](log|error|warn|info|debug|trace)',
  '(info|warn|error|debug|trace)![(]',
  'logger->(info|error|warning|debug|critical|notice)',
  'Logger[.](info|warn|warning|error|debug|critical|notice)',
  'slog[.](Info|Warn|Error|Debug)',
  'logrus[.](Info|Warn|Error|Debug|Fatal)',
  '(LOG|LOGGER)[.](info|warn|warning|error|debug|trace|fatal)',
  '[lL]og(ger)?[.]Log(Trace|Debug|Information|Warning|Error|Critical)',
  'System[.](out|err)[.]print(ln)?',
  'panic!?[(]',
  'eprintln![(]',
  '[.]expect[(]',
  '(^|[^A-Za-z])[lL]og[A-Za-z_]*[.][^;]*[.]([iI]nfo|[eE]rror|[eE]xception|[wW]arn(ing)?|[dD]ebug|[fF]atal|[cC]ritical)[(]',
  '(^|[^A-Za-z])[lL]og(ger)?[(][)][.]([iI]nfo|[eE]rror|[wW]arn(ing)?|[dD]ebug|[fF]atal)[(]',
  'level[.](Error|Warn|Info|Debug)[(]',
  '[.](Error|Warn|Info|Debug|Fatal)[(][)][^.]*[.]Msg',
  'Log::(error|warning|info|debug|critical|alert|emergency|notice)',
  'fprintf[(]stderr',
  'println[ (]',
  '[lL]og(ger|ging)?[.]log[(]',
  '[lL]og(ger)?->log[(]',
] as const;
