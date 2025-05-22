/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('Security labs content', () => {
  describe('content format', () => {
    const contentDir = path.join(__dirname, 'security_labs');

    const files = fs.readdirSync(contentDir);

    files.forEach((file) => {
      it(`should have non-empty string content in file: ${file}`, () => {
        const filePath = path.join(contentDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        expect(typeof content).toBe('string');
        expect(content.trim().length).toBeGreaterThan(0);
      });
    });

    files.forEach((file) => {
      it(`should have title and slug defined in yaml header: ${file}`, () => {
        const filePath = path.join(contentDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        const split = content.split('---');
        const yamlString = split[1];
        const article = split[2];
        const parsed = yaml.load(yamlString) as {
          slug: string;
          title: string;
        };

        const slug = parsed.slug;
        const title = parsed.title;
        expect(slug).toBeDefined();
        expect(title).toBeDefined();
        expect(typeof slug).toBe('string');
        expect(typeof title).toBe('string');
        expect(slug.trim().length).toBeGreaterThan(0);
        expect(title.trim().length).toBeGreaterThan(0);

        expect(article).toBeDefined();
        expect(typeof article).toBe('string');
      });
    });

    files.forEach((file) => {
      it(`article should come after yaml definition: ${file}`, () => {
        const filePath = path.join(contentDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        const split = content.split('---');
        const article = split[2];

        expect(article).toBeDefined();
        expect(typeof article).toBe('string');
        expect(article.trim().length).toBeGreaterThan(0);
      });
    });
  });
});
