/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtelSignal } from '../models/otel_signal_codec';
import { normalizedKeyWords, type OtelSourceWindow } from './extract_otel_signals';
import { isProductionOtelPath } from './path_policy';
import {
  isNonExecutableAtOffset,
  outsideSourceCommentState,
  sourceWithoutComments,
} from './source_comment_policy';

/** Final key words that name a low-cardinality category worth grouping a metric by. */
const groupingKeyPattern: RegExp =
  /(?:^|_)(?:name|kind|type|status|status_code|state|category|class|outcome|result|reason|phase|mode|level|method|operation|action)$/;
/** Names of people and files end in `name` but are unbounded or personal values. */
const unboundedNameKeyPattern: RegExp =
  /(?:^|_)(?:user|username|customer|person|email|file|display|first|last|full)_name$/;
/** Keeps predicted metric queries readable and their series count bounded. */
const maxDimensions: number = 3;
/** Measurement arguments may wrap over several lines after the receiver line. */
export const measurementWindowLines: number = 8;
/** Leaves headroom under the source reader's 2,048-character pattern limit. */
const maxGrepPatternLength: number = 1_800;

/** Instrument variables that can be matched literally in a grep pattern and a source receiver. */
const instrumentNamePattern: RegExp = /^[A-Za-z_]\w*$/;
/** Metric names whose only ERE metacharacter is `.`, so they can be escaped with `[.]`. */
const metricNamePattern: RegExp = /^[\w.\-/:]+$/;
/** Shared tail of every measurement grep: a member call to a synchronous instrument's recording method. */
const measurementCallGrepSuffix: string =
  '[[:space:]]*([?]?[.]|->)[[:space:]]*(add|Add|record|Record)[[:space:]]*[(]';

/** Finds a measurement call by instrument variable, or by a metric-name subscript such as `metrics["a.b"]`. */
const measurementCallPattern: RegExp =
  /(?:(?<![\w$])\$?([A-Za-z_]\w*)|\[\s*(["'`])([^"'`\n]+)\2\s*\])\s*(?:\?\.|\.|->)\s*(?:add|Add|record|Record)\s*\(/g;
/** Quoted keys in object, dict, hash, and PHP array literals: `{ "k": v }`, `{ 'k' => v }`. */
const quotedKeyPattern: RegExp = /(["'`])([A-Za-z_][\w.\-/]*)\1\s*(?::(?![:=])|=>)/g;
/** Keys passed to attribute constructors: Go `attribute.String`, Java `AttributeKey`, Rust `KeyValue`, C# pairs. */
const constructedKeyPattern: RegExp =
  /(?:\battribute\.(?:String|Bool|Int|Int64|Float64)(?:Slice)?|\bAttributeKey\.(?:string|long|boolean|double)(?:Array)?Key|\bKeyValue(?:::|\.)new|\bKeyValuePair(?:\s*<[^<>\n]*>|\.Create)?|\bnew)\s*\(\s*(["'`])([A-Za-z_][\w.\-/]*)\1/g;
/** C# collection-initializer pairs such as `new TagList { { "k", v } }`. */
const pairInitializerKeyPattern: RegExp = /\{\s*(["'`])([A-Za-z_][\w.\-/]*)\1\s*,/g;
/** Unquoted object keys, which only JavaScript, TypeScript, and Ruby treat as literal names. */
const bareKeyPattern: RegExp = /[{,]\s*([A-Za-z_$][\w$]*)\s*:(?![:=])/g;
/** Languages whose unquoted object keys are literal attribute names. */
const bareKeyExtensionPattern: RegExp = /\.(?:[cm]?[jt]sx?|rb)$/i;
/** Identifiers in measurement arguments that may refer to a key declared elsewhere in the file. */
const keyReferencePattern: RegExp = /(?<![\w$.])[A-Za-z_$][\w$]*(?![\w$])/g;
/** Declarations of reusable attribute keys, such as Java `K = AttributeKey.stringKey("k")` or Go `k = attribute.Key("k")`. */
const keyBindingPattern: RegExp =
  /([A-Za-z_$][\w$]*)(?:\s*:(?![:=])\s*[\w$.]+(?:<[^<>=;\n]*>)?)?\s*(?::=|(?<![=!<>])=(?![=>]))\s*(?:\battribute\.Key|\bAttributeKey\.(?:string|long|boolean|double)(?:Array)?Key)\s*\(\s*(["'`])([A-Za-z_][\w.\-/]*)\2/g;

/** Identifies the instrument a measurement call records to. */
export type MeasurementReceiver = { readonly instrument: string } | { readonly metricName: string };

/** One measurement call and the attribute keys recorded with it, in argument order. */
export interface MetricMeasurement {
  readonly keys: readonly string[];
  readonly line: number;
  readonly path: string;
  readonly receiver: MeasurementReceiver;
}

/** Returns whether an attribute key names a low-cardinality category rather than an ID, content, or measure. */
export const isGroupingDimensionKey = (key: string): boolean => {
  /** Word-separated key shared with the attribute value-hint vocabularies. */
  const words: string = normalizedKeyWords(key);
  return groupingKeyPattern.test(words) && !unboundedNameKeyPattern.test(words);
};

/** Returns literal metric signals whose measurement calls can be searched for. */
const linkableInstruments = (signals: readonly OtelSignal[]): readonly OtelSignal[] =>
  signals.filter(
    (signal) =>
      signal.kind === 'metric_name' &&
      signal.templated !== true &&
      signal.value !== undefined &&
      signal.value.length > 0
  );

/** Splits alternatives into as few grep patterns as the length limit allows. */
const batchedPatterns = (
  alternatives: readonly string[],
  render: (joined: string) => string
): readonly string[] => {
  /** Completed patterns, each within the source reader's length limit. */
  const patterns: string[] = [];
  /** Alternatives collected for the pattern being built. */
  let batch: string[] = [];
  for (const alternative of alternatives) {
    if (render(alternative).length > maxGrepPatternLength) continue;
    if (
      batch.length > 0 &&
      render([...batch, alternative].join('|')).length > maxGrepPatternLength
    ) {
      patterns.push(render(batch.join('|')));
      batch = [];
    }
    batch.push(alternative);
  }
  if (batch.length > 0) patterns.push(render(batch.join('|')));
  return patterns;
};

/** Builds case-sensitive git-grep ERE patterns that find measurement calls for the extracted instruments. */
export const metricMeasurementGrepPatterns = (
  signals: readonly OtelSignal[]
): readonly string[] => {
  /** Literal metric signals; dynamic names cannot be linked to measurements. */
  const instruments: readonly OtelSignal[] = linkableInstruments(signals);
  /** Sorted unique instrument variables keep the generated patterns deterministic. */
  const variables: readonly string[] = [
    ...new Set(
      instruments.flatMap(({ instrument }) =>
        instrument !== undefined && instrumentNamePattern.test(instrument) ? [instrument] : []
      )
    ),
  ].sort();
  /** Metric names used as lookup keys, for instruments stored in a map or dict. */
  const names: readonly string[] = [
    ...new Set(
      instruments.flatMap(({ value }) =>
        value !== undefined && metricNamePattern.test(value) ? [value.replaceAll('.', '[.]')] : []
      )
    ),
  ].sort();
  return [
    ...batchedPatterns(
      variables,
      (joined) => `(^|[^A-Za-z0-9_])(${joined})${measurementCallGrepSuffix}`
    ),
    ...batchedPatterns(
      names,
      (joined) => `[[]["'\`](${joined})["'\`][]]${measurementCallGrepSuffix}`
    ),
  ];
};

/** Returns the text between a call's opening parenthesis and its balanced close, or to the window end. */
const callArguments = (content: string, openParenthesis: number): string => {
  /** Nesting depth across parentheses, brackets, and braces. */
  let depth: number = 0;
  /** The delimiter of the string literal being skipped, if any. */
  let quote: string | undefined;
  for (let index = openParenthesis; index < content.length; index++) {
    /** Current source character. */
    const character: string = content[index];
    if (quote !== undefined) {
      if (character === '\\') index++;
      else if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'" || character === '`') {
      quote = character;
    } else if ('([{'.includes(character)) {
      depth++;
    } else if (')]}'.includes(character) && --depth === 0) {
      return content.slice(openParenthesis + 1, index);
    }
  }
  return content.slice(openParenthesis + 1);
};

/** Returns the attribute keys in measurement arguments, in source order and without duplicates. */
const keysInArguments = ({
  args,
  keyBindings,
  path,
}: {
  readonly args: string;
  readonly keyBindings: ReadonlyMap<string, string> | undefined;
  readonly path: string;
}): readonly string[] => {
  /** Keys paired with their argument offsets so the syntaxes can be merged into source order. */
  const found: { readonly key: string; readonly offset: number }[] = [];
  for (const pattern of [quotedKeyPattern, constructedKeyPattern, pairInitializerKeyPattern]) {
    for (const match of args.matchAll(pattern))
      found.push({ key: match[2], offset: match.index ?? 0 });
  }
  if (bareKeyExtensionPattern.test(path)) {
    for (const match of args.matchAll(bareKeyPattern)) {
      found.push({ key: match[1], offset: match.index ?? 0 });
    }
  }
  if (keyBindings !== undefined) {
    for (const match of args.matchAll(keyReferencePattern)) {
      /** Key declared for this identifier in the same file, if any. */
      const key: string | undefined = keyBindings.get(match[0]);
      if (key !== undefined) found.push({ key, offset: match.index ?? 0 });
    }
  }
  return [
    ...new Set(found.sort((left, right) => left.offset - right.offset).map(({ key }) => key)),
  ];
};

/** Collects reusable attribute-key declarations per path from comment-masked source windows. */
export const attributeKeyBindings = (
  windows: readonly OtelSourceWindow[]
): ReadonlyMap<string, ReadonlyMap<string, string>> => {
  /** Identifier-to-key maps keyed by repository path. */
  const bindings: Map<string, Map<string, string>> = new Map();
  for (const window of windows) {
    /** Masked source ignores commented-out declarations. */
    const content: string = sourceWithoutComments({
      content: window.content,
      initialState: window.initialCommentState ?? outsideSourceCommentState,
      path: window.path,
    });
    for (const match of content.matchAll(keyBindingPattern)) {
      if (
        isNonExecutableAtOffset({
          content,
          initialState: outsideSourceCommentState,
          offset: match.index ?? 0,
          path: window.path,
        })
      )
        continue;
      /** Path-scoped map, created on first use. */
      const pathBindings: Map<string, string> = bindings.get(window.path) ?? new Map();
      pathBindings.set(match[1], match[3]);
      bindings.set(window.path, pathBindings);
    }
  }
  return bindings;
};

/** Extracts the measurement call on each window's first line together with its attribute keys. */
export const extractMetricMeasurements = ({
  keyBindings,
  windows,
}: {
  readonly keyBindings: ReadonlyMap<string, ReadonlyMap<string, string>>;
  /** Each window starts at the grep-matched receiver line. */
  readonly windows: readonly OtelSourceWindow[];
}): readonly MetricMeasurement[] => {
  /** Measurements in window order. */
  const measurements: MetricMeasurement[] = [];
  for (const window of windows) {
    if (!isProductionOtelPath(window.path)) continue;
    /** Masked source keeps commented-out calls and keys out of the result. */
    const content: string = sourceWithoutComments({
      content: window.content,
      initialState: window.initialCommentState ?? outsideSourceCommentState,
      path: window.path,
    });
    /** Later lines belong to their own windows, which start at their own grep hit. */
    const firstLineEnd: number = content.includes('\n') ? content.indexOf('\n') : content.length;
    for (const match of content.matchAll(measurementCallPattern)) {
      /** Offset of the receiver within the masked window. */
      const offset: number = match.index ?? 0;
      if (offset > firstLineEnd) break;
      if (
        isNonExecutableAtOffset({
          content,
          initialState: outsideSourceCommentState,
          offset,
          path: window.path,
        })
      )
        continue;
      measurements.push({
        keys: keysInArguments({
          args: callArguments(content, offset + match[0].length - 1),
          keyBindings: keyBindings.get(window.path),
          path: window.path,
        }),
        line: window.startLine,
        path: window.path,
        receiver: match[1] === undefined ? { metricName: match[3] } : { instrument: match[1] },
      });
    }
  }
  return measurements;
};

/** Returns the metric signals one measurement call records to. */
const instrumentsFor = ({
  byInstrument,
  instruments,
  measurement,
}: {
  readonly byInstrument: ReadonlyMap<string, readonly OtelSignal[]>;
  readonly instruments: readonly OtelSignal[];
  readonly measurement: MetricMeasurement;
}): readonly OtelSignal[] => {
  if ('metricName' in measurement.receiver) {
    /** Metric name used as the lookup key at the call site. */
    const metricName: string = measurement.receiver.metricName;
    return instruments.filter(({ value }) => value === metricName);
  }
  /** Every instrument assigned to a variable with this name anywhere in the repository. */
  const candidates: readonly OtelSignal[] = byInstrument.get(measurement.receiver.instrument) ?? [];
  /** A same-file instrument is the most specific match for a shared variable name. */
  const sameFile: readonly OtelSignal[] = candidates.filter(
    ({ evidence }) => evidence[0]?.path === measurement.path
  );
  if (sameFile.length > 0) return sameFile;
  // Cross-file calls (for example, generated telemetry builders) link only when the variable name is unambiguous.
  return candidates.length === 1 ? candidates : [];
};

/** Adds low-cardinality measurement attribute keys to the metric signals they were recorded with. */
export const withMetricDimensions = ({
  measurements,
  signals,
}: {
  readonly measurements: readonly MetricMeasurement[];
  readonly signals: readonly OtelSignal[];
}): readonly OtelSignal[] => {
  /** Literal metric signals that measurement calls may refer to. */
  const instruments: readonly OtelSignal[] = linkableInstruments(signals);
  /** Instruments grouped by their source variable name. */
  const byInstrument: Map<string, OtelSignal[]> = new Map();
  for (const signal of instruments) {
    if (signal.instrument === undefined) continue;
    byInstrument.set(signal.instrument, [...(byInstrument.get(signal.instrument) ?? []), signal]);
  }
  /** Recorded keys per metric signal, in sorted measurement order. */
  const keysBySignal: Map<OtelSignal, string[]> = new Map();
  /** Sorting keeps the dimension order independent of read completion order. */
  const sorted: readonly MetricMeasurement[] = [...measurements].sort(
    (left, right) => left.path.localeCompare(right.path) || left.line - right.line
  );
  for (const measurement of sorted) {
    for (const signal of instrumentsFor({ byInstrument, instruments, measurement })) {
      keysBySignal.set(signal, [...(keysBySignal.get(signal) ?? []), ...measurement.keys]);
    }
  }
  return signals.map((signal) => {
    /** Unique grouping keys, capped so the query stays readable. */
    const dimensions: readonly string[] = [
      ...new Set((keysBySignal.get(signal) ?? []).filter(isGroupingDimensionKey)),
    ].slice(0, maxDimensions);
    return dimensions.length === 0 ? signal : { ...signal, dimensions };
  });
};
