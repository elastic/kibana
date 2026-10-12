/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';

// EUI's icon map ships without type declarations; type the one export the test needs.
const { typeToPathMap } = jest.requireActual<{ typeToPathMap: Record<string, unknown> }>(
  '@elastic/eui/lib/components/icon/icon_map'
);

// Lives in server/ because public code may not import Node builtins; it scans the brief's UI folder.
const UI_DIR = path.resolve(
  __dirname,
  '../../../../public/entity_analytics/components/executive_brief'
);

const ICON_LITERAL =
  /iconType(?:=|:\s*)["']([A-Za-z0-9]+)["']|iconType:\s*["']([A-Za-z0-9]+)["']|^\s+\w+:\s*["']([A-Za-z0-9]+)["'],?\s*\/\/\s*icon/gm;

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__fixtures__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });

describe('executive brief icon names', () => {
  it('only uses icon names that exist in the installed EUI (no blank icons)', () => {
    expect(fs.existsSync(UI_DIR)).toBe(true);
    const unknown = sourceFiles(UI_DIR).flatMap((file) =>
      [...fs.readFileSync(file, 'utf8').matchAll(ICON_LITERAL)]
        .map((match) => match[1] ?? match[2] ?? match[3])
        .filter((name) => !(name in typeToPathMap))
        .map((name) => `${path.relative(UI_DIR, file)}: ${name}`)
    );

    expect(unknown).toEqual([]);
  });
});
