/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeZodSchema } from '@kbn/agent-builder-server';
import { getConnectorSpec, isSelectedActionEnabled, isToolAction } from '@kbn/connector-specs';
import type { AgentConnector } from './agent_connectors';
import type { SandboxCallableField, SandboxCallableTool } from './sandbox_callable_tools';

export const KIBANA_SDK_PATH = '/workspace/kibana_sdk.py';

const PYTHON_TYPES: Readonly<Record<string, string>> = {
  string: 'str',
  number: 'float',
  integer: 'int',
  boolean: 'bool',
  array: 'list',
  object: 'dict',
};

const PYTHON_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const PYTHON_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
  'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
]); // prettier-ignore

const isPythonName = (name: string): boolean =>
  PYTHON_IDENTIFIER.test(name) && !PYTHON_KEYWORDS.has(name);

const toSnakeCase = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

/** A Python string literal for arbitrary text. JSON string escapes are valid Python escapes. */
const pyString = (text: string): string => JSON.stringify(text);

const docstring = (lines: string[]): string =>
  `"""${lines.join('\n').replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"')}"""`;

/** A callable the module exposes, with what `search_tools` needs to find and explain it. */
interface CatalogEntry {
  /** How the agent writes the call, such as `kibana.my_es.esql` or `kibana.tools.search`. */
  path: string;
  kind: 'connector' | 'tool';
  description: string;
  params: SandboxCallableField[];
}

interface RenderedMethod {
  pythonName: string;
  source: string;
  entry: Omit<CatalogEntry, 'path'>;
}

/**
 * Renders one method that calls `callExpression`, with the keyword-only signature and the
 * docstring generated from the parameters.
 */
const renderMethod = ({
  pythonName,
  description,
  fields,
  callExpression,
  kind,
}: {
  pythonName: string;
  description: string;
  fields: SandboxCallableField[];
  callExpression: (sent: string, hasExtra: boolean) => string;
  kind: CatalogEntry['kind'];
}): RenderedMethod => {
  const usable = fields.filter(({ name }) => isPythonName(name));
  // A parameter we cannot spell as a Python keyword argument goes through `extra`.
  const hasUnspellable = usable.length !== fields.length;
  const required = usable.filter(({ required: isRequired }) => isRequired);
  const optional = usable.filter(({ required: isRequired }) => !isRequired);
  const hint = (type: string) => PYTHON_TYPES[type] ?? 'object';

  const signature = [
    ...required.map(({ name, type }) => `${name}: ${hint(type)}`),
    ...optional.map(({ name, type }) => `${name}: ${hint(type)} = None`),
    ...(hasUnspellable ? ['extra: dict = None'] : []),
  ];
  const doc = [
    description,
    ...(fields.length > 0 ? ['', 'Parameters:'] : []),
    ...fields.map(
      ({ name, type, required: isRequired, description: text }) =>
        `  ${name} (${type}${isRequired ? ', required' : ''})${text ? `: ${text}` : ''}`
    ),
  ];
  const sent = [...required, ...optional].map(({ name }) => `${pyString(name)}: ${name}`);

  const source = [
    `    def ${pythonName}(self${signature.length > 0 ? ', *, ' + signature.join(', ') : ''}):`,
    `        ${docstring(doc).replace(/\n/g, '\n        ')}`,
    `        return ${callExpression(`{${sent.join(', ')}}`, hasUnspellable)}`,
  ].join('\n');
  return { pythonName, source, entry: { kind, description, params: fields } };
};

const callableSubActions = (connector: AgentConnector): RenderedMethod[] => {
  const spec = getConnectorSpec(connector.actionTypeId);
  if (!spec) return [];
  return Object.keys(spec.actions)
    .filter(
      (name) => isToolAction(spec, name) && isSelectedActionEnabled(name, connector.selectedActions)
    )
    .flatMap((name) => {
      const action = spec.actions[name];
      const pythonName = toSnakeCase(name);
      if (!action || !isPythonName(pythonName)) return [];
      return [
        renderMethod({
          pythonName,
          kind: 'connector',
          description: action.description ?? `Runs the ${name} sub-action.`,
          fields: describeZodSchema(action.input),
          callExpression: (sent, hasExtra) =>
            `self._call(${pyString(name)}, ${sent}${hasExtra ? ', extra' : ''})`,
        }),
      ];
    });
};

/** A Python attribute name, unique among `taken`. */
const uniqueAttribute = (base: string, taken: Set<string>): string => {
  const snake = base || 'connector';
  const safe = isPythonName(snake) ? snake : `c_${snake}`;
  let candidate = safe;
  for (let i = 2; taken.has(candidate); i++) candidate = `${safe}_${i}`;
  taken.add(candidate);
  return candidate;
};

const PRELUDE = `"""Typed access to Kibana from the sandbox. Generated by Kibana: do not edit.

Every call runs in Kibana as the user of this conversation, with the connector's credentials,
and returns parsed data. Results with \`columns\` and \`values\` (ES|QL) come back as a list of
row dicts. Nothing is printed unless you print it: filter, join and aggregate in Python, then
print only what you need to read, and loop over many calls in one script.

    import sys; sys.path.insert(0, "/workspace")
    from kibana_sdk import kibana
    kibana.search_tools("error rate by service")   # find what to call, without reading every schema
    kibana.search_tools("mapping", detail="full")  # signature and parameters of the matches
    kibana.esql("FROM logs-* | STATS c = COUNT(*) BY service.name")
    es = kibana.connectors["<connector-id>"]       # a connector, by the id /workspace/connectors.md lists
    es.<sub_action>(param=...)                     # its sub-actions, with keyword parameters
    kibana.tools.<tool>(param=...)                 # a Kibana tool; returns its data
"""
import json
import re
import subprocess
import sys
import traceback


class KibanaError(Exception):
    """Kibana refused or failed a call. The message is the reason."""


def _excepthook(kind, error, tb):
    """An uncaught KibanaError prints the reason and the caller's frames, not this module's."""
    if not issubclass(kind, KibanaError):
        return sys.__excepthook__(kind, error, tb)
    frames = [f for f in traceback.extract_tb(tb) if not f.filename.endswith("kibana_sdk.py")]
    print("".join(traceback.format_list(frames)), end="", file=sys.stderr)
    print(f"KibanaError: {error}", file=sys.stderr)


sys.excepthook = _excepthook


def _reason(proc):
    text = (proc.stderr or proc.stdout).strip() or f"kbn-tool exited with {proc.returncode}"
    return re.sub(r"^kbn-tool: ", "", text)


def _run(args, stdin=None):
    proc = subprocess.run(["kbn-tool", *args], input=stdin, capture_output=True, text=True)
    if proc.returncode != 0:
        raise KibanaError(_reason(proc)) from None
    return proc.stdout


def _rows(data):
    if isinstance(data, dict) and isinstance(data.get("columns"), list) and isinstance(data.get("values"), list):
        names = [c["name"] if isinstance(c, dict) else c for c in data["columns"]]
        return [dict(zip(names, row)) for row in data["values"]]
    return data


class _Connector:
    def __init__(self, connector_id, name, type_id):
        self.id = connector_id
        self.name = name
        self.type = type_id

    def _call(self, sub_action, params, extra=None):
        body = {k: v for k, v in params.items() if v is not None}
        body.update(extra or {})
        out = _run(["connector", self.id, sub_action, "--params", "-"], stdin=json.dumps(body))
        return _rows(json.loads(out)) if out.strip() else None


def _unwrap(result):
    """The data of a tool result, with tabular data as row dicts.

    A result with one block is that block's data; one with several is a list of
    {"type", "data"} blocks, so a query and its warnings stay apart.
    """
    blocks = result.get("results", []) if isinstance(result, dict) else result
    if not isinstance(blocks, list):
        return blocks
    unwrapped = [{"type": b.get("type"), "data": _rows(b.get("data"))} if isinstance(b, dict) else b for b in blocks]
    return unwrapped[0]["data"] if len(unwrapped) == 1 and isinstance(unwrapped[0], dict) else unwrapped


class _Tools:
    def _call(self, tool_id, params, extra=None):
        body = {k: v for k, v in params.items() if v is not None}
        body.update(extra or {})
        out = _run(["call", tool_id, "--params", "-"], stdin=json.dumps(body))
        return _unwrap(json.loads(out)) if out.strip() else None


def _words(text):
    return [w for w in re.split(r"[^a-z0-9]+", str(text).lower().replace("_", " ")) if w]


def _score(entry, terms):
    name = set(_words(entry["path"]))
    description = set(_words(entry["description"]))
    params = set()
    for p in entry["params"]:
        params.update(_words(p["name"]))
        params.update(_words(p.get("description") or ""))
    score = 0
    for term in terms:
        score += 3 * any(term in w for w in name)
        score += 2 * any(term in w for w in description)
        score += 1 * any(term in w for w in params)
    return score


def _first_sentence(text, limit=220):
    sentence = re.split(r"(?<=[.!?])\\s", text.strip(), maxsplit=1)[0]
    return sentence if len(sentence) <= limit else sentence[: limit - 1] + "…"


def _describe(entry, detail):
    if detail == "name":
        return entry["path"]
    if detail == "description":
        return f"{entry['path']}  -  {_first_sentence(entry['description'])}"
    names = ", ".join(p["name"] + ("" if p["required"] else "=None") for p in entry["params"])
    lines = [f"{entry['path']}({names})", f"    {entry['description']}"]
    for p in entry["params"]:
        extra = f": {p['description']}" if p.get("description") else ""
        lines.append(f"      {p['name']} ({p['type']}{', required' if p['required'] else ''}){extra}")
    return "\\n".join(lines)


class _Kibana:
    def esql(self, query, limit=1000):
        """Runs an ES|QL query against the cluster behind Kibana. Returns a list of row dicts."""
        out = _run(["esql", "--limit", str(limit), query])
        return [json.loads(line) for line in out.splitlines() if line.strip()]

    def call(self, tool_id, **params):
        """Runs a Kibana tool by its full id and returns its parsed result."""
        return _Tools()._call(tool_id, params)

    def search_tools(self, query="", detail="description", limit=8):
        """Finds connector sub-actions and Kibana tools by keyword and prints them.

        detail: "name" (just the call path), "description" (default) or "full" (signature and
        every parameter). An empty query lists every path. Returns the matching paths.
        """
        terms = _words(query)
        ranked = sorted(((_score(e, terms), e) for e in _CATALOG), key=lambda pair: -pair[0])
        hits = [e for s, e in ranked if s > 0 or not terms][: limit if terms else len(_CATALOG)]
        if not hits:
            print("No match. Try other words, or search with an empty query to list everything.")
        for entry in hits:
            print(_describe(entry, detail))
        return [e["path"] for e in hits]

    def help(self):
        print(__doc__)
        print(f"{len(_CATALOG)} callables are available: use kibana.search_tools(...) to find them.")
        for line in _OVERVIEW:
            print(line)

`;

/**
 * Renders \`/workspace/kibana_sdk.py\`: a Python module that wraps \`kbn-tool\` in typed functions
 * generated from the connector specs and the Kibana tools a script may call, with a keyword search
 * over them so the agent reads only the schemas it needs.
 */
export const renderKibanaSdk = (
  connectors: readonly AgentConnector[],
  tools: readonly SandboxCallableTool[] = []
): string => {
  const taken = new Set<string>(['esql', 'call', 'help', 'search_tools', 'tools', 'connectors']);
  const classes: string[] = [];
  const attributes: string[] = ['kibana.connectors = {}'];
  const catalog: CatalogEntry[] = [
    {
      path: 'kibana.esql',
      kind: 'tool',
      description:
        'Runs an ES|QL query against the Elasticsearch cluster behind Kibana and returns a list of row dicts.',
      params: [
        { name: 'query', type: 'string', required: true, description: 'The ES|QL query.' },
        {
          name: 'limit',
          type: 'integer',
          required: false,
          description: 'Rows to return, default 1000.',
        },
      ],
    },
  ];
  const overview: string[] = [];

  connectors.forEach((connector, index) => {
    const subActions = callableSubActions(connector);
    if (subActions.length === 0) return;
    const attribute = uniqueAttribute(
      toSnakeCase(connector.name) || toSnakeCase(connector.actionTypeId),
      taken
    );
    const className = `_Connector${index}`;
    classes.push(
      [
        `class ${className}(_Connector):`,
        `    ${docstring([`${connector.name} (type ${connector.actionTypeId}).`])}`,
        '',
        ...subActions.map(({ source }) => source),
      ].join('\n')
    );
    attributes.push(
      `kibana.${attribute} = ${className}(${pyString(connector.id)}, ${pyString(
        connector.name
      )}, ${pyString(connector.actionTypeId)})`
    );
    attributes.push(`kibana.connectors[${pyString(connector.id)}] = kibana.${attribute}`);
    overview.push(
      `kibana.connectors[${pyString(connector.id)}] (kibana.${attribute}): ${connector.name} (${
        connector.actionTypeId
      }), ${subActions.length} sub-actions`
    );
    for (const method of subActions) {
      catalog.push({ path: `kibana.${attribute}.${method.pythonName}`, ...method.entry });
    }
  });

  if (tools.length > 0) {
    const used = new Set<string>();
    const methods = tools.flatMap((tool) => {
      const short = toSnakeCase(tool.id.replace(/^platform\.core\./, ''));
      const pythonName = isPythonName(short) && !used.has(short) ? short : toSnakeCase(tool.id);
      if (!isPythonName(pythonName) || used.has(pythonName)) return [];
      used.add(pythonName);
      return [
        renderMethod({
          pythonName,
          kind: 'tool',
          description: tool.description,
          fields: tool.fields,
          callExpression: (sent, hasExtra) =>
            `self._call(${pyString(tool.id)}, ${sent}${hasExtra ? ', extra' : ''})`,
        }),
      ];
    });
    classes.push(
      ['class _KibanaTools(_Tools):', ...methods.map(({ source }) => source)].join('\n')
    );
    attributes.push('kibana.tools = _KibanaTools()');
    overview.push(`kibana.tools: ${methods.length} Kibana tools`);
    for (const method of methods) {
      catalog.push({ path: `kibana.tools.${method.pythonName}`, ...method.entry });
    }
  }

  return [
    PRELUDE,
    '',
    ...classes.flatMap((source) => [source, '']),
    `_CATALOG = json.loads(${pyString(JSON.stringify(catalog))})`,
    `_OVERVIEW = json.loads(${pyString(JSON.stringify(overview))})`,
    '',
    'kibana = _Kibana()',
    ...attributes,
    '',
  ].join('\n');
};
