/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync, spawnSync } from 'child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { renderKibanaSdk } from './kibana_sdk';

const ELASTICSEARCH = {
  id: 'es-1',
  name: 'My Elasticsearch',
  actionTypeId: '.elasticsearch',
  selectedActions: ['esql', 'search'],
} as never;

describe('renderKibanaSdk', () => {
  it('generates a Python module that compiles and exposes the enabled sub-actions', () => {
    const source = renderKibanaSdk([ELASTICSEARCH]);
    const file = join(mkdtempSync(join(tmpdir(), 'kibana-sdk-')), 'kibana_sdk.py');
    writeFileSync(file, source);

    const output = execFileSync(
      'python3',
      [
        '-c',
        `import importlib.util as u
s = u.spec_from_file_location("kibana_sdk", ${JSON.stringify(
          file
        )}); m = u.module_from_spec(s); s.loader.exec_module(m)
k = m.kibana
print(sorted(n for n in dir(k.my_elasticsearch) if not n.startswith("_") and n not in ("id", "name", "type")))
print(k.my_elasticsearch.esql.__doc__)`,
      ],
      { encoding: 'utf8' }
    );

    expect(output).toContain("['esql', 'search']");
    expect(output).toContain('Parameters:');
  });

  it('lists tools and finds them with search_tools', () => {
    const source = renderKibanaSdk(
      [ELASTICSEARCH],
      [
        {
          id: 'platform.core.get_index_mapping',
          description: 'Returns the field mapping of an index. Use it before writing queries.',
          fields: [{ name: 'index', type: 'string', required: true, description: 'Index name' }],
        },
      ]
    );
    const file = join(mkdtempSync(join(tmpdir(), 'kibana-sdk-')), 'kibana_sdk.py');
    writeFileSync(file, source);

    const output = execFileSync(
      'python3',
      [
        '-c',
        `import importlib.util as u
s = u.spec_from_file_location("kibana_sdk", ${JSON.stringify(
          file
        )}); m = u.module_from_spec(s); s.loader.exec_module(m)
k = m.kibana
print(k.search_tools("field mapping of an index"))
k.search_tools("get_index_mapping", detail="full")
print(k.search_tools("zzzz"))
print(callable(k.tools.get_index_mapping))
print(m._unwrap({"results": [{"type": "other", "data": {"a": 1}}]}))
print(m._unwrap({"results": [{"type": "query", "data": {"esql": "x"}}, {"type": "tabular", "data": {"columns": [{"name": "c"}], "values": [[1]]}}]}))`,
      ],
      { encoding: 'utf8' }
    );

    expect(output).toContain('kibana.tools.get_index_mapping');
    expect(output).toContain('index (string, required): Index name');
    expect(output).toContain('No match');
    expect(output).toContain("True\n{'a': 1}\n");
    expect(output.trim().endsWith("{'type': 'tabular', 'data': [{'c': 1}]}]")).toBe(true);
  });

  it('prints a refused call as the reason plus the caller frames, and returns rows otherwise', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kibana-sdk-'));
    const file = join(dir, 'kibana_sdk.py');
    writeFileSync(file, renderKibanaSdk([ELASTICSEARCH]));
    // A stand-in for the CLI: a bad query fails like Kibana's refusal, any other returns one row.
    const fake = join(dir, 'kbn-tool');
    writeFileSync(
      fake,
      `#!/bin/sh
if [ "$1" = "connector" ] && grep -q bad; then echo "kbn-tool: Elasticsearch error (verification_exception): Unknown column [x]" >&2; exit 1; fi
echo '{"columns":[{"name":"c"}],"values":[[3]]}'`
    );
    chmodSync(fake, 0o755);
    const run = (query: string) =>
      spawnSync(
        'python3',
        [
          '-c',
          `import importlib.util as u
s = u.spec_from_file_location("kibana_sdk", ${JSON.stringify(
            file
          )}); m = u.module_from_spec(s); s.loader.exec_module(m)
print(m.kibana.connectors["es-1"].esql(query=${JSON.stringify(query)}))`,
        ],
        { encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}` } }
      );

    expect(run('good').stdout.trim()).toBe("[{'c': 3}]");
    const failed = run('bad');
    expect(failed.status).not.toBe(0);
    expect(failed.stderr).toContain(
      'KibanaError: Elasticsearch error (verification_exception): Unknown column [x]'
    );
    expect(failed.stderr).not.toContain('kibana_sdk.py');
  });

  it('omits connectors without callable sub-actions', () => {
    const source = renderKibanaSdk([{ id: 'x', name: 'Unknown', actionTypeId: '.nope' }]);
    expect(source).not.toContain('kibana.unknown');
  });
});
