/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_WORKFLOW_WRAPPER_NAME_LENGTH } from '../models/classification_codec';
import type { SourceLocation } from '../source_location_codec';
import { loggingIdiomPatterns } from './idiom_patterns';

/** How a wrapper is called: as a bare function, as a member, or both. */
export interface WrapperCallForms {
  readonly bare: boolean;
  readonly member: boolean;
}

/** A function or method declaration found on one source line. */
interface Declaration {
  readonly forms: WrapperCallForms;
  readonly name: string;
}

/** A logging wrapper the classifier named and the source proved is declared. */
export interface LoggingWrapper {
  /** The sink window and declaration context the classifier saw. */
  readonly evidence: readonly SourceLocation[];
  readonly forms: WrapperCallForms;
  readonly name: string;
  /** Repository-relative file that declares the wrapper. */
  readonly path: string;
}

/** Wrapper names are plain identifiers, so they can be placed in a search pattern without escaping. */
const identifierPattern: RegExp = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Words that a declaration-shaped line can start with but never name a function. */
const keywords: ReadonlySet<string> = new Set([
  'catch',
  'else',
  'for',
  'foreach',
  'function',
  'if',
  'return',
  'switch',
  'while',
  'with',
]);

/**
 * Method names that event emitters, streams, and loggers also use. A free function with one of
 * these names is searched only as a bare call, so `emitter.emit("close")` is not a candidate.
 */
const commonMethodNames: ReadonlySet<string> = new Set([
  'apply',
  'bind',
  'call',
  'debug',
  'dispatch',
  'emit',
  'end',
  'error',
  'handle',
  'info',
  'log',
  'next',
  'notify',
  'on',
  'once',
  'print',
  'publish',
  'push',
  'run',
  'send',
  'trace',
  'warn',
  'write',
]);

/** Call forms of a free function; common method names stay bare-only. */
const functionForms = (name: string): WrapperCallForms => ({
  bare: true,
  member: !commonMethodNames.has(name),
});

/** Methods are only called through a receiver. */
const methodForms: WrapperCallForms = { bare: false, member: true };

/** Declaration shapes across the supported languages; group 1 is the declared name. */
const declarationExpressions: readonly {
  readonly forms: (name: string, line: string) => WrapperCallForms;
  readonly pattern: RegExp;
}[] = [
  // JavaScript, TypeScript, and PHP functions.
  {
    forms: functionForms,
    pattern: /(?:^|[^A-Za-z0-9_$])function\s*\*?\s+([A-Za-z_][A-Za-z0-9_]*)\s*[<(]/,
  },
  // JavaScript and TypeScript functions assigned to a variable.
  {
    forms: functionForms,
    pattern:
      /(?:^|[^A-Za-z0-9_$])(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:function\b|\(|[A-Za-z_$][A-Za-z0-9_$]*\s*=>)/,
  },
  // Python functions and methods.
  {
    forms: (name, line) =>
      /def\s+\w+\s*\(\s*(?:self|cls)\b/.test(line) ? methodForms : functionForms(name),
    pattern: /^\s*(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
  },
  // Go methods with a receiver.
  { forms: () => methodForms, pattern: /^\s*func\s+\([^)]*\)\s*([A-Za-z_][A-Za-z0-9_]*)\s*[[(]/ },
  // Go functions.
  { forms: functionForms, pattern: /^\s*func\s+([A-Za-z_][A-Za-z0-9_]*)\s*[[(]/ },
  // Kotlin and Rust functions.
  {
    forms: functionForms,
    pattern: /(?:^|[^A-Za-z0-9_$])(?:fun|fn)\s+(?:<[^>]*>\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*[<(]/,
  },
  // JavaScript and TypeScript class or object methods that open their body on the same line.
  {
    forms: () => methodForms,
    pattern:
      /^\s*(?:(?:public|private|protected|static|async|override)\s+)*([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*(?::\s*[^{=]+)?\{\s*$/,
  },
  // Java, C#, and similar methods with modifiers and a return type.
  {
    forms: () => methodForms,
    pattern:
      /^\s*(?:(?:public|private|protected|internal|static|final|synchronized|virtual|override|async)\s+)+[A-Za-z_][A-Za-z0-9_<>,.?[\] ]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/,
  },
];

/** Returns the declarations on one source line. */
const declarationsOn = (line: string): readonly Declaration[] =>
  declarationExpressions.flatMap(({ forms, pattern }) => {
    const name: string | undefined = pattern.exec(line)?.[1];
    return name === undefined || keywords.has(name) ? [] : [{ forms: forms(name, line), name }];
  });

/** Returns the first declaration of `name` in source text, if the text declares it. */
const declarationOf = (text: string, name: string): Declaration | undefined =>
  text
    .split('\n')
    .flatMap(declarationsOn)
    .find((declaration) => declaration.name === name);

/** Returns the zero-based index of the nearest line before `beforeIndex` that declares a function. */
export const enclosingDeclarationIndex = (
  lines: readonly string[],
  beforeIndex: number
): number | undefined => {
  for (let index: number = beforeIndex - 1; index >= 0; index -= 1) {
    if (declarationsOn(lines[index]).length > 0) return index;
  }
  return undefined;
};

/** Standard logging idioms locate the call on a candidate's matched line. */
const loggingIdiomExpressions: readonly RegExp[] = loggingIdiomPatterns.map(
  (pattern) => new RegExp(pattern, 'i')
);

/** Characters of argument text inspected after the opening parenthesis of a logging call. */
const argumentLookahead: number = 400;

/** Returns whether text contains a standard logging call, which a log message never does. */
export const containsLoggingCall = (text: string): boolean =>
  loggingIdiomExpressions.some((expression) => expression.test(text));

/** A message that is only an identifier or member path, such as `name` or `event.type`. */
const codeReferencePattern: RegExp =
  /^[A-Za-z_$][A-Za-z0-9_$]*(?:[?]?[.][A-Za-z_$][A-Za-z0-9_$]*)*$/;

/**
 * Returns whether a classifier's static message is source code from the excerpt rather than
 * message text: a logging call, or a variable or member path that never starts a quoted literal.
 * An event name such as `pi.error` passes because the source quotes it.
 */
export const isSourceCodeMessage = (message: string, excerpt: string): boolean =>
  containsLoggingCall(message) ||
  (codeReferencePattern.test(message) &&
    !['"', "'", '`'].some((quote) => excerpt.includes(`${quote}${message}`)));

/** Returns the argument text of the logging call on the matched line, if a standard idiom is there. */
const sinkArgument = (sourceWindow: string, matchedLineIndex: number): string | undefined => {
  const lines: readonly string[] = sourceWindow.split('\n');
  const line: string | undefined = lines[matchedLineIndex];
  if (line === undefined) return undefined;
  /** Earliest standard idiom on the line; custom patterns have no known call position. */
  const callStart: number = loggingIdiomExpressions.reduce((earliest, expression) => {
    const index: number = line.search(expression);
    return index >= 0 && index < earliest ? index : earliest;
  }, line.length);
  const open: number = line.indexOf('(', callStart);
  if (callStart === line.length || open < 0) return undefined;
  /** Argument text, which may continue on the following lines of the window. */
  return [line.slice(open + 1), ...lines.slice(matchedLineIndex + 1)]
    .join('\n')
    .trimStart()
    .slice(0, argumentLookahead);
};

/**
 * Returns whether the logging call on the matched line passes a non-literal message, such as a
 * parameter. Only then can the call be the sink of a logging wrapper.
 */
export const hasDynamicMessage = (sourceWindow: string, matchedLineIndex: number): boolean => {
  const argument: string | undefined = sinkArgument(sourceWindow, matchedLineIndex);
  if (argument === undefined || argument.length === 0) return false;
  // A string literal, possibly prefixed (Python f-strings) or wrapped in a format call.
  if (/^[fFrRbBuU]?["'`]/.test(argument)) return false;
  if (/^[A-Za-z_$][\w$.]*\s*\(\s*["'`]/.test(argument)) return false;
  // OpenTelemetry log records carry the message in a body field.
  if (argument.startsWith('{')) return !/\b(?:body|message|msg)\s*:\s*["'`]/.test(argument);
  if (argument.startsWith(')')) return !/[.]set[Bb]ody\s*\(\s*["'`]/.test(argument);
  return true;
};

/** Receiver parameters that never carry a message. */
const receiverParameters: ReadonlySet<string> = new Set(['cls', 'self', 'this']);

/**
 * Returns the identifiers that may name each parameter of the declaration on a line. The first
 * and last identifier before a default cover both `name: Type` or `name Type` and `Type name`.
 */
const parameterNamesOf = (line: string, name: string): readonly string[] => {
  const afterName: string = line.slice(line.indexOf(name) + name.length);
  const bareArrow = /^\s*=\s*(?:async\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*=>/.exec(afterName);
  if (bareArrow !== null) return [bareArrow[1]];
  const open: number = afterName.indexOf('(');
  if (open < 0) return [];
  const parameters: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of afterName.slice(open + 1)) {
    if (depth === 0 && (character === ',' || character === ')')) {
      parameters.push(current);
      current = '';
      if (character === ')') break;
      continue;
    }
    if ('([{<'.includes(character)) depth += 1;
    if (')]}>'.includes(character)) depth = Math.max(0, depth - 1);
    current += character;
  }
  return parameters.flatMap((parameter) => {
    const identifiers: readonly string[] =
      parameter.split('=')[0].match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? [];
    const first: string | undefined = identifiers[0];
    const last: string | undefined = identifiers[identifiers.length - 1];
    return [...new Set([first, last])].filter(
      (identifier): identifier is string =>
        identifier !== undefined && !receiverParameters.has(identifier)
    );
  });
};

/**
 * Names the wrapper a sink sits in when the sink's message argument uses a parameter of the
 * enclosing declaration, so callers choose the message. The result still needs `loggingWrapperFor`.
 */
export const declaredWrapperName = ({
  declarationLine,
  matchedLineIndex,
  sourceWindow,
}: {
  readonly declarationLine: string;
  readonly matchedLineIndex: number;
  readonly sourceWindow: string;
}): string | undefined => {
  const argument: string | undefined = sinkArgument(sourceWindow, matchedLineIndex);
  if (argument === undefined || !hasDynamicMessage(sourceWindow, matchedLineIndex)) {
    return undefined;
  }
  return declarationsOn(declarationLine).find(({ name }) =>
    parameterNamesOf(declarationLine, name).some((parameter) =>
      new RegExp(`(?:^|[^A-Za-z0-9_$.])${parameter.replace(/\$/g, '\\$')}(?![A-Za-z0-9_$])`).test(
        argument
      )
    )
  )?.name;
};

/**
 * Validates a classifier-named wrapper against the source the classifier saw. The name must be a
 * plain identifier that the candidate's own code declares, so a model cannot invent a search.
 */
export const loggingWrapperFor = ({
  evidence,
  name,
  sourceWindow,
}: {
  readonly evidence: readonly SourceLocation[];
  readonly name: string;
  readonly sourceWindow: string;
}): LoggingWrapper | undefined => {
  if (name.length > MAX_WORKFLOW_WRAPPER_NAME_LENGTH || !identifierPattern.test(name)) {
    return undefined;
  }
  const path: string | undefined = evidence[0]?.path;
  if (path === undefined) return undefined;
  /** Only source from the wrapper's own file can prove its declaration. */
  const sameFile: readonly string[] = [
    sourceWindow,
    ...evidence.filter((location) => location.path === path).map(({ excerpt }) => excerpt),
  ];
  const declaration: Declaration | undefined = sameFile
    .map((text) => declarationOf(text, name))
    .find((found) => found !== undefined);
  return declaration === undefined ? undefined : { evidence, forms: declaration.forms, name, path };
};

/** Returns an ERE that finds calls to the given names whose first argument is a string literal. */
export const wrapperCallPattern = ({
  bareNames,
  memberNames,
}: {
  readonly bareNames: readonly string[];
  readonly memberNames: readonly string[];
}): string | undefined => {
  /** A literal first argument, possibly after blanks; source readers reject control characters. */
  const literalArgument: string = '[[:blank:]]*[(][[:blank:]]*["\'`]';
  const alternatives: readonly string[] = [
    ...(bareNames.length === 0
      ? []
      : [`(^|[^A-Za-z0-9_$.])(${bareNames.join('|')})${literalArgument}`]),
    ...(memberNames.length === 0 ? [] : [`[.](${memberNames.join('|')})${literalArgument}`]),
  ];
  return alternatives.length === 0 ? undefined : alternatives.join('|');
};

/** Returns an ERE that finds object properties assigned the wrapper, such as `event: emit`. */
export const wrapperAliasPattern = (name: string): string =>
  `[A-Za-z_][A-Za-z0-9_]*[[:blank:]]*:[[:blank:]]*${name}([^A-Za-z0-9_$]|$)`;

/** Returns the property names a source line assigns the wrapper to. */
export const wrapperAliasesOn = (line: string, name: string): readonly string[] =>
  [...line.matchAll(new RegExp(`([A-Za-z_][A-Za-z0-9_]*)\\s*:\\s*${name}(?![A-Za-z0-9_$])`, 'g'))]
    .map((match) => match[1])
    .filter((alias) => !keywords.has(alias));

/** Words in an event name or message that mark an error. */
const errorWords: RegExp =
  /(?:^|[^a-z])(?:fail(?:ed|ure|ures|s)?|errors?|exceptions?|fatal|panic(?:ked)?|crash(?:ed)?|abort(?:ed)?)(?:[^a-z]|$)/i;
/** Words in an event name or message that mark a warning. */
const warningWords: RegExp =
  /(?:^|[^a-z])(?:warn(?:ing)?|denied|timeout|timed[ _.-]?out|retry(?:ing)?|retries|rejected|degraded)(?:[^a-z]|$)/i;

/** Chooses a level from the words of a wrapper's literal message when the classifier gave none. */
export const levelForMessage = (message: string): string => {
  /** Splits camel case so `turnFailed` reads as `turn Failed`. */
  const words: string = message.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  if (errorWords.test(words)) return 'error';
  return warningWords.test(words) ? 'warn' : 'info';
};
