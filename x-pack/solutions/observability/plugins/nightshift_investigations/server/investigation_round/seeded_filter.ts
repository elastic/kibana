/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { internalTools, ToolResultType, type ToolResult } from '@kbn/agent-builder-common';
import { PROPOSALS_CREATE_TOOL_ID } from '@kbn/proposals-common';
import { CORTEX_ENTITY_TYPE_BUCKETS, CORTEX_ENTITY_TYPES } from '../../common/cortex';
import { INVESTIGATION_TOOL_IDS } from '../agents/investigation';
import { CORTEX_WORKSPACE_ROOT } from '../cortex/materialize';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { DECISION_TREE_WORKSPACE_ROOT } from '../decision_trees/materialize';
import { MEMORY_WORKSPACE_ROOT } from '../memory/materialize';
import { SANDBOX_BASH_TOOL_ID } from '../tools/sandbox_bash/tool';
import {
  CONNECTOR_DOCS_ROOT,
  CONNECTOR_MANIFEST_PATH,
  ELASTIC_MANIFEST_PATH,
} from '../tools/sandbox_bash/connector_docs';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../tools/sandbox_bash/write_file_tool';
import type { InvestigationTranscriptStep } from './round_loader';

export const SEEDED_WORKSPACE_KINDS = ['cortex', 'memories', 'decision_trees', 'env_docs'] as const;

export type SeededWorkspaceKind = (typeof SEEDED_WORKSPACE_KINDS)[number];

export const SEEDED_ENV_FILES = [ELASTIC_MANIFEST_PATH, CONNECTOR_MANIFEST_PATH] as const;

const SEEDED_ROOT_BY_KIND: Record<SeededWorkspaceKind, string> = {
  cortex: CORTEX_WORKSPACE_ROOT,
  memories: MEMORY_WORKSPACE_ROOT,
  decision_trees: DECISION_TREE_WORKSPACE_ROOT,
  env_docs: CONNECTOR_DOCS_ROOT,
};

const SEEDED_DIR_NAMES = new Set<string>([
  'cortex',
  'memories',
  'decision-trees',
  '.connector-docs',
]);
const CORTEX_BUCKET_NAMES = new Set<string>(
  CORTEX_ENTITY_TYPES.map((entityType) => CORTEX_ENTITY_TYPE_BUCKETS[entityType])
);

export const FILE_TOOL_IDS = new Set<string>([
  SANDBOX_VIEW_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
  SANDBOX_WRITE_FILE_TOOL_ID,
]);

export const NON_EVIDENCE_TOOL_IDS = new Set<string>([
  // The agent records its findings with these; they are conclusions, not evidence.
  ...INVESTIGATION_TOOL_IDS,
  'platform.streams.investigation_progress_report',
  PROPOSALS_CREATE_TOOL_ID,
  internalTools.writeTodos,
  internalTools.listFiles,
  internalTools.loadSkill,
  internalTools.searchRelevantSkills,
  internalTools.sleep,
  internalTools.setConversationMetadata,
  internalTools.askUserQuestion,
  SANDBOX_WRITE_FILE_TOOL_ID,
  SANDBOX_STR_REPLACE_TOOL_ID,
]);

export interface SeededFilterOptions {
  /**
   * Which seeded workspace roots/files to treat as non-evidence reads.
   * Defaults to all 4 (`['cortex', 'memories', 'decision_trees', 'env_docs']`) so no optimizer
   * echoes its own seeded files or cross-contaminates another store.
   */
  skipRoots?: readonly SeededWorkspaceKind[];
  /**
   * When true, also filters out non-evidence process/recording tools (`write_todos`,
   * `record_hypothesis`, `str_replace`, `write_file`, etc.).
   */
  skipNonEvidenceTools?: boolean;
  /**
   * `'drop_step'` removes matching tool steps entirely; `'omit_result'` keeps the tool call
   * in the sequence while replacing its result with a short omitted marker (used when rebuilding
   * provider tool-call history where every tool call must remain paired with a result).
   */
  mode?: 'drop_step' | 'omit_result';
}

export const matchesFilePathForKinds = (
  rawPath: string,
  kinds: ReadonlySet<SeededWorkspaceKind>,
  baseDir = '/workspace'
): boolean => {
  const resolved = Path.posix.resolve(baseDir, rawPath);
  if (kinds.has('env_docs') && (SEEDED_ENV_FILES as readonly string[]).includes(resolved)) {
    return true;
  }
  for (const kind of SEEDED_WORKSPACE_KINDS) {
    if (!kinds.has(kind)) {
      continue;
    }
    const root = SEEDED_ROOT_BY_KIND[kind];
    if (resolved === root || resolved.startsWith(`${root}/`)) {
      return true;
    }
  }
  return false;
};

const matchesOrContainsSeededForKinds = (
  rawPath: string,
  kinds: ReadonlySet<SeededWorkspaceKind>,
  baseDir = '/workspace'
): boolean => {
  if (matchesFilePathForKinds(rawPath, kinds, baseDir)) {
    return true;
  }
  const resolved = Path.posix.resolve(baseDir, rawPath);
  const prefix = resolved === '/' ? '/' : `${resolved}/`;
  if (kinds.has('env_docs') && SEEDED_ENV_FILES.some((envFile) => envFile.startsWith(prefix))) {
    return true;
  }
  for (const kind of SEEDED_WORKSPACE_KINDS) {
    if (!kinds.has(kind)) {
      continue;
    }
    const root = SEEDED_ROOT_BY_KIND[kind];
    if (root.startsWith(prefix)) {
      return true;
    }
  }
  return false;
};

const BASH_URL_RE = /\bhttps?:\/\/[^\s'")]+/gi;
const BASH_CD_RE = /^\s*cd\s+(?:'([^']+)'|"([^"]+)"|([^\s'";|&()<>]+))/;
const HEREDOC_OPEN_RE = /<<-?\s*['"]?([A-Za-z0-9_]+)['"]?/;
const SHELL_INTERPRETER_VERBS = new Set<string>(['sh', 'bash', 'zsh']);
const SCRIPT_INTERPRETER_VERBS = new Set<string>(['python', 'python3', 'node', 'perl', 'ruby']);
const DIR_OR_SEARCH_VERBS = new Set<string>([
  'ls',
  'find',
  'tree',
  'du',
  'rg',
  'grep',
  'egrep',
  'fgrep',
]);
const QUERY_OR_NETWORK_VERBS = new Set<string>(['curl', 'wget', 'esql']);
const SHELL_PREFIX_WORDS = new Set<string>([
  'do',
  'then',
  'else',
  'elif',
  'while',
  'until',
  'if',
  'time',
  '!',
  'env',
  'command',
  'sudo',
]);

export const PATH_TOKEN_RE = /[a-zA-Z0-9_./-]+/g;
const BASH_QUOTED_STRING_RE = /'[^']*'|"(?:[^"\\]|\\.)*"/g;
const BASH_UNQUOTED_STDOUT_REDIRECT_RE = /(?:^|[^\d&>])(?:1|&)?>>?\|?\s*(?!&)(?!\/dev\/stdout\b)/;

export const extractSegmentVerb = (segment: string): string | undefined => {
  for (const raw of segment.trim().split(/\s+/)) {
    const token = raw.replace(/^\(+/, '');
    if (!token || SHELL_PREFIX_WORDS.has(token)) {
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
      continue;
    }
    const match = /^[A-Za-z0-9_./-]+/.exec(token);
    return match ? Path.posix.basename(match[0]).toLowerCase() : undefined;
  }
  return undefined;
};

/**
 * Extracts file paths read inside an inline or heredoc script (`python`, `node`, etc.),
 * resolving simple `var = 'path'` bindings and ignoring write-mode `open(..., 'w' | 'a' | 'x' | '+')` calls.
 */
export const extractScriptReadPaths = (script: string): string[] => {
  const normalized = script.replace(/\\(["'])/g, '$1');
  const bindings = new Map<string, string>();

  const assignRe = /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:Path\s*\(\s*)?(['"])([^'"\n]+)\2/g;
  let assignMatch = assignRe.exec(normalized);
  while (assignMatch) {
    bindings.set(assignMatch[1], assignMatch[3]);
    assignMatch = assignRe.exec(normalized);
  }

  const resolveArg = (rawArg: string): string | undefined => {
    const trimmed = rawArg.trim();
    const pathWrap = /^Path\s*\(([^()]+)\)$/.exec(trimmed);
    const inner = pathWrap ? pathWrap[1].trim() : trimmed;
    if (
      (inner.startsWith("'") && inner.endsWith("'")) ||
      (inner.startsWith('"') && inner.endsWith('"'))
    ) {
      return inner.slice(1, -1);
    }
    return bindings.get(inner);
  };

  const out: string[] = [];

  // 1. open(target[, mode])
  const openRe =
    /\bopen\s*\(\s*(Path\s*\([^()\n]+\)|['"][^'"\n]+['"]|[A-Za-z_][A-Za-z0-9_]*)(?:\s*,\s*(?:mode\s*=\s*)?(['"])([^'"\n]*)\2)?/g;
  let openMatch = openRe.exec(normalized);
  while (openMatch) {
    const mode = openMatch[3] ?? 'r';
    if (!/[wax+]/.test(mode)) {
      const resolved = resolveArg(openMatch[1]);
      if (resolved) {
        out.push(resolved);
      }
    }
    openMatch = openRe.exec(normalized);
  }

  // 2. Path(target).read_text() / var.read_text()
  const readTextRe =
    /(?:Path\s*\(\s*(['"][^'"\n]+['"]|[A-Za-z_][A-Za-z0-9_]*)\s*\)|([A-Za-z_][A-Za-z0-9_]*))\s*\.\s*read_text\s*\(/g;
  let rtMatch = readTextRe.exec(normalized);
  while (rtMatch) {
    const resolved = resolveArg(rtMatch[1] ?? rtMatch[2]);
    if (resolved) {
      out.push(resolved);
    }
    rtMatch = readTextRe.exec(normalized);
  }

  // 3. fs.readFileSync(target) / fs.readFile(target)
  const readFileRe =
    /\breadFile(?:Sync)?\s*\(\s*(Path\s*\([^()\n]+\)|['"][^'"\n]+['"]|[A-Za-z_][A-Za-z0-9_]*)/g;
  let rfMatch = readFileRe.exec(normalized);
  while (rfMatch) {
    const resolved = resolveArg(rfMatch[1]);
    if (resolved) {
      out.push(resolved);
    }
    rfMatch = readFileRe.exec(normalized);
  }

  return out;
};

const splitOutsideQuotes = (input: string, mode: 'list' | 'pipeline'): string[] => {
  const parts: string[] = [];
  let cur = '';
  let quote: "'" | '"' | undefined;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === '\\' && quote === '"' && i + 1 < input.length) {
        cur += ch + input[i + 1];
        i += 1;
        continue;
      }
      if (ch === quote) {
        quote = undefined;
      }
      cur += ch;
      continue;
    }
    if (ch === '\\' && i + 1 < input.length) {
      cur += ch + input[i + 1];
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (mode === 'list') {
      if (ch === ';') {
        parts.push(cur);
        cur = '';
        continue;
      }
      if ((ch === '&' && input[i + 1] === '&') || (ch === '|' && input[i + 1] === '|')) {
        parts.push(cur);
        cur = '';
        i += 1;
        continue;
      }
    } else if (ch === '|' && input[i + 1] !== '|') {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }

  parts.push(cur);
  return parts;
};

export interface BashSegmentWithCwd {
  segment: string;
  cwd: string;
  /** Index within a `|` pipeline (`0` for the first command, `> 0` when reading piped stdin). */
  pipelineIndex: number;
  /** Optional non-shell interpreter script body attached via heredoc (`python - <<'PY'`). */
  scriptBody?: string;
}

/**
 * Splits a bash command into segments while stripping write-only heredoc bodies, preserving
 * shell/interpreter heredoc bodies, and tracking `cd <dir>` updates against `workingDirectory`.
 */
export const splitBashSegmentsWithCwd = (
  command: string,
  workingDirectory?: string
): BashSegmentWithCwd[] => {
  let cwd =
    typeof workingDirectory === 'string' && workingDirectory.trim().length > 0
      ? Path.posix.resolve('/workspace', workingDirectory.trim())
      : '/workspace';

  const lines = command.split('\n');
  const processedLines: Array<{ line: string; scriptBody?: string }> = [];
  let activeDelimiter: string | undefined;
  let activeMode: 'drop' | 'shell' | 'script' = 'drop';
  let pendingHeaderLine = '';
  let scriptBuffer: string[] = [];

  for (const line of lines) {
    if (activeDelimiter !== undefined) {
      if (line.trim() === activeDelimiter) {
        if (activeMode === 'script') {
          processedLines.push({
            line: pendingHeaderLine,
            scriptBody: scriptBuffer.join('\n'),
          });
        }
        activeDelimiter = undefined;
        scriptBuffer = [];
      } else if (activeMode === 'shell') {
        processedLines.push({ line });
      } else if (activeMode === 'script') {
        scriptBuffer.push(line);
      }
      continue;
    }

    const match = HEREDOC_OPEN_RE.exec(line);
    if (match) {
      activeDelimiter = match[1];
      const headerBeforeHeredoc = line.slice(0, match.index);
      const strippedLine = headerBeforeHeredoc + line.slice(match.index + match[0].length);
      const verb = extractSegmentVerb(headerBeforeHeredoc);
      const unquotedLine = line.replace(BASH_QUOTED_STRING_RE, '');
      const hasStdoutFileRedirect = BASH_UNQUOTED_STDOUT_REDIRECT_RE.test(unquotedLine);

      if (verb && !hasStdoutFileRedirect && SHELL_INTERPRETER_VERBS.has(verb)) {
        activeMode = 'shell';
        processedLines.push({ line: strippedLine });
      } else if (verb && !hasStdoutFileRedirect && SCRIPT_INTERPRETER_VERBS.has(verb)) {
        activeMode = 'script';
        pendingHeaderLine = strippedLine;
        scriptBuffer = [];
      } else {
        activeMode = 'drop';
        processedLines.push({ line: strippedLine });
      }
      continue;
    }

    processedLines.push({ line });
  }

  if (activeDelimiter !== undefined && activeMode === 'script') {
    processedLines.push({
      line: pendingHeaderLine,
      scriptBody: scriptBuffer.join('\n'),
    });
  }

  const out: BashSegmentWithCwd[] = [];
  for (const { line, scriptBody } of processedLines) {
    const sanitizedLine = line.replace(BASH_URL_RE, '');
    const statements = splitOutsideQuotes(sanitizedLine, 'list');
    for (const statement of statements) {
      const stages = splitOutsideQuotes(statement, 'pipeline');
      for (let pipelineIndex = 0; pipelineIndex < stages.length; pipelineIndex++) {
        const segment = stages[pipelineIndex];
        const cdMatch = BASH_CD_RE.exec(segment);
        if (cdMatch) {
          const target = cdMatch[1] ?? cdMatch[2] ?? cdMatch[3];
          if (target && stages.length === 1) {
            cwd = Path.posix.resolve(cwd, target);
          }
          continue;
        }
        out.push({
          segment,
          cwd,
          pipelineIndex,
          ...(scriptBody && pipelineIndex === stages.length - 1 ? { scriptBody } : {}),
        });
      }
    }
  }

  return out;
};

const SEARCH_VALUE_FLAGS = new Set<string>([
  '-e',
  '--regexp',
  '-f',
  '--file',
  '-m',
  '--max-count',
  '-A',
  '--after-context',
  '-B',
  '--before-context',
  '-C',
  '--context',
  '-g',
  '--glob',
  '-t',
  '--type',
  '--include',
  '--exclude',
  '--exclude-dir',
  '--color',
  '--colour',
  '-d',
  '--directories',
]);

const tokenizeShellWords = (segment: string): string[] => {
  const words: string[] = [];
  const wordRe = /'([^']*)'|"((?:[^"\\]|\\.)*)"|([^\s'";|&()<>]+)/g;
  let match = wordRe.exec(segment);
  while (match) {
    const raw = match[1] ?? match[2]?.replace(/\\(["'\\])/g, '$1') ?? match[3] ?? '';
    if (raw.length > 0) {
      words.push(raw);
    }
    match = wordRe.exec(segment);
  }
  return words;
};

const checkDirOrSearchSegment = (
  segment: string,
  verb: string,
  cwd: string,
  pipelineIndex: number,
  kindSet: ReadonlySet<SeededWorkspaceKind>
): boolean => {
  const words = tokenizeShellWords(segment);
  let verbIdx = -1;
  for (let i = 0; i < words.length; i++) {
    const token = words[i].replace(/^\(+/, '');
    if (!token || SHELL_PREFIX_WORDS.has(token) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
      continue;
    }
    verbIdx = i;
    break;
  }
  if (verbIdx === -1) {
    return false;
  }

  const args = words.slice(verbIdx + 1);
  if (verb === 'find') {
    const findPaths: string[] = [];
    for (const arg of args) {
      if (arg === '-H' || arg === '-L' || arg === '-P') {
        continue;
      }
      if (arg.startsWith('-') || arg === '!' || arg === '(') {
        break;
      }
      findPaths.push(arg);
    }
    if (findPaths.length > 0) {
      return findPaths.some((p) => matchesOrContainsSeededForKinds(p, kindSet, cwd));
    }
    return matchesOrContainsSeededForKinds(cwd, kindSet);
  }

  const isGrepOrRg = verb === 'grep' || verb === 'egrep' || verb === 'fgrep' || verb === 'rg';
  let hasExplicitPatternFlag = false;
  let isRecursive = verb === 'rg' || verb === 'tree' || verb === 'du';
  let optionsEnded = false;
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!optionsEnded && arg === '--') {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && arg.startsWith('-') && arg !== '-') {
      if (arg.startsWith('--')) {
        if (arg === '--regexp' || arg.startsWith('--regexp=')) {
          hasExplicitPatternFlag = true;
        }
        if (arg === '--file' || arg.startsWith('--file=')) {
          hasExplicitPatternFlag = true;
          const fileArg = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : args[i + 1];
          if (fileArg && fileArg !== '-' && matchesFilePathForKinds(fileArg, kindSet, cwd)) {
            return true;
          }
        }
        if (arg === '--recursive') {
          isRecursive = true;
        }
        if (SEARCH_VALUE_FLAGS.has(arg)) {
          i += 1;
        }
        continue;
      }

      const cluster = arg.slice(1);
      const firstEFIdx = isGrepOrRg ? cluster.search(/[ef]/) : -1;
      const flagPrefix = firstEFIdx !== -1 ? cluster.slice(0, firstEFIdx) : cluster;
      if (
        /^[a-zA-Z]+$/.test(flagPrefix) &&
        (flagPrefix.includes('r') || flagPrefix.includes('R'))
      ) {
        isRecursive = true;
      }

      if (firstEFIdx !== -1 && /^[a-zA-Z]*$/.test(flagPrefix)) {
        hasExplicitPatternFlag = true;
        const flagChar = cluster[firstEFIdx];
        const attachedVal = cluster.slice(firstEFIdx + 1);
        if (flagChar === 'f') {
          const fileArg = attachedVal.length > 0 ? attachedVal : args[i + 1];
          if (fileArg && fileArg !== '-' && matchesFilePathForKinds(fileArg, kindSet, cwd)) {
            return true;
          }
        }
        if (attachedVal.length === 0) {
          i += 1;
        }
        continue;
      }

      if (SEARCH_VALUE_FLAGS.has(arg)) {
        i += 1;
      }
      continue;
    }
    positional.push(arg);
  }

  const matchTarget = isRecursive ? matchesOrContainsSeededForKinds : matchesFilePathForKinds;
  const pathOperands = isGrepOrRg && !hasExplicitPatternFlag ? positional.slice(1) : positional;
  if (pathOperands.length > 0) {
    return pathOperands.some((op) => op !== '-' && matchTarget(op, kindSet, cwd));
  }

  return (pipelineIndex === 0 || isRecursive) && matchTarget(cwd, kindSet);
};

const isCandidateSeededToken = (
  rawToken: string,
  cwd: string,
  allowBareSeededDir: boolean
): boolean => {
  const lower = rawToken.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.index.json')) {
    return true;
  }
  const parts = rawToken.split('/').filter((part) => part.length > 0 && part !== '.');
  if (parts.some((part) => SEEDED_DIR_NAMES.has(part))) {
    return rawToken.includes('/') || allowBareSeededDir;
  }
  if (cwd === CORTEX_WORKSPACE_ROOT && parts.length > 0 && CORTEX_BUCKET_NAMES.has(parts[0])) {
    return true;
  }
  return false;
};

const bashAccessesSeededWorkspace = (
  command: string,
  workingDirectory: string | undefined,
  kindSet: ReadonlySet<SeededWorkspaceKind>
): boolean => {
  for (const { segment, cwd, pipelineIndex, scriptBody } of splitBashSegmentsWithCwd(
    command,
    workingDirectory
  )) {
    const verb = extractSegmentVerb(segment);

    if (scriptBody) {
      if (
        extractScriptReadPaths(scriptBody).some((p) => matchesFilePathForKinds(p, kindSet, cwd))
      ) {
        return true;
      }
    }

    if (verb && SCRIPT_INTERPRETER_VERBS.has(verb)) {
      if (extractScriptReadPaths(segment).some((p) => matchesFilePathForKinds(p, kindSet, cwd))) {
        return true;
      }
    }

    if (verb && DIR_OR_SEARCH_VERBS.has(verb)) {
      if (checkDirOrSearchSegment(segment, verb, cwd, pipelineIndex, kindSet)) {
        return true;
      }
      continue;
    }

    const allowBareSeededDir = Boolean(verb && !QUERY_OR_NETWORK_VERBS.has(verb));
    // Strip JSON `"key":"value"` pairs and `== "value"` query comparisons before scanning bare tokens
    const strippedQueryLiterals = segment
      .replace(/"[a-zA-Z0-9_.-]+"\s*:\s*"[a-zA-Z0-9_.-]+"/g, '')
      .replace(/[=!]==?\s*\\?["'][a-zA-Z0-9_.-]+\\?["']/g, '');

    const tokens = strippedQueryLiterals.match(PATH_TOKEN_RE) ?? [];
    for (const token of tokens) {
      if (token.startsWith('-')) {
        continue;
      }
      if (
        isCandidateSeededToken(token, cwd, allowBareSeededDir) &&
        matchesFilePathForKinds(token, kindSet, cwd)
      ) {
        return true;
      }
    }
  }

  return false;
};

/**
 * True when a tool call accesses one of the specified Nightshift-seeded workspace roots or files
 * (`cortex`, `memories`, `decision_trees`, `env_docs`) via a file tool or `bash` command.
 */
export const isSeededWorkspaceAccess = (
  toolId: string | undefined,
  params: Record<string, unknown> | undefined,
  options?: Pick<SeededFilterOptions, 'skipRoots'>
): boolean => {
  if (!toolId || !params) {
    return false;
  }
  const skipRoots = options?.skipRoots ?? SEEDED_WORKSPACE_KINDS;
  if (skipRoots.length === 0) {
    return false;
  }
  const kindSet = new Set<SeededWorkspaceKind>(skipRoots);

  const filePath = params.file_path ?? params.path;
  if ((FILE_TOOL_IDS.has(toolId) || typeof filePath === 'string') && typeof filePath === 'string') {
    return matchesFilePathForKinds(filePath, kindSet);
  }

  if (
    (toolId === SANDBOX_BASH_TOOL_ID || toolId.endsWith('bash')) &&
    typeof params.command === 'string'
  ) {
    const workingDirectory =
      typeof params.working_directory === 'string' ? params.working_directory : undefined;
    return bashAccessesSeededWorkspace(params.command, workingDirectory, kindSet);
  }

  return false;
};

/** True when a tool call is an evidence-gathering call rather than a seeded-knowledge read or process tool. */
export const isEvidenceToolCall = (
  toolId: string | undefined,
  params: Record<string, unknown> | undefined,
  options?: Pick<SeededFilterOptions, 'skipRoots'>
): boolean =>
  Boolean(toolId) &&
  !NON_EVIDENCE_TOOL_IDS.has(toolId!) &&
  !isSeededWorkspaceAccess(toolId, params, { skipRoots: options?.skipRoots });

export const OMITTED_SEEDED_RESULT_REASON = 'Nightshift-seeded workspace file; not evidence';

const omittedToolResult = (toolCallId: string | undefined, reason: string): ToolResult => ({
  tool_result_id: `${toolCallId ?? 'call'}-omitted`,
  type: ToolResultType.other,
  data: { omitted: reason },
});

const shouldFilterCall = (
  toolId: string,
  params: Record<string, unknown>,
  skipRoots: readonly SeededWorkspaceKind[],
  skipNonEvidenceTools: boolean
): boolean =>
  (skipNonEvidenceTools && NON_EVIDENCE_TOOL_IDS.has(toolId)) ||
  isSeededWorkspaceAccess(toolId, params, { skipRoots });

/**
 * Filters normalized `InvestigationTranscriptStep[]` according to `SeededFilterOptions`.
 */
export const filterSeededWorkspaceSteps = (
  steps: readonly InvestigationTranscriptStep[],
  options?: SeededFilterOptions
): InvestigationTranscriptStep[] => {
  const skipRoots = options?.skipRoots ?? SEEDED_WORKSPACE_KINDS;
  const skipNonEvidenceTools = options?.skipNonEvidenceTools ?? false;
  const mode = options?.mode ?? 'drop_step';

  const out: InvestigationTranscriptStep[] = [];
  for (const step of steps) {
    if (
      step.kind !== 'tool' ||
      !shouldFilterCall(step.toolId, step.params, skipRoots, skipNonEvidenceTools)
    ) {
      out.push(step);
      continue;
    }
    if (mode === 'omit_result') {
      out.push({
        ...step,
        results: [omittedToolResult(step.toolCallId, OMITTED_SEEDED_RESULT_REASON)],
        resultText: `omitted: ${OMITTED_SEEDED_RESULT_REASON}`,
      });
    }
  }
  return out;
};

/**
 * Filters raw `InvestigationToolCall[]` according to `SeededFilterOptions`.
 */
export const filterSeededWorkspaceToolCalls = (
  toolCalls: readonly InvestigationToolCall[],
  options?: SeededFilterOptions
): InvestigationToolCall[] => {
  const skipRoots = options?.skipRoots ?? SEEDED_WORKSPACE_KINDS;
  const skipNonEvidenceTools = options?.skipNonEvidenceTools ?? false;
  const mode = options?.mode ?? 'drop_step';

  const out: InvestigationToolCall[] = [];
  for (const call of toolCalls) {
    const toolId = call.tool_id ?? 'unknown_tool';
    const params = call.params ?? {};
    if (!shouldFilterCall(toolId, params, skipRoots, skipNonEvidenceTools)) {
      out.push(call);
      continue;
    }
    if (mode === 'omit_result') {
      out.push({
        ...call,
        results: call.results
          ? [omittedToolResult(call.tool_call_id, OMITTED_SEEDED_RESULT_REASON)]
          : undefined,
      });
    }
  }
  return out;
};
