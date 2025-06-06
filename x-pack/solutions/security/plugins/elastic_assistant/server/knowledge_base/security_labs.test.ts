/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import globby from 'globby';
import {
  decryptSecurityLabsContent,
  ENCODED_FILE_MICROMATCH_PATTERN,
  PLAIN_TEXT_FILE_MICROMATCH_PATTERN,
} from '@kbn/ai-security-labs-content';

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

describe('Security labs content', () => {
  const directoryPath = path.join(__dirname, 'security_labs');
  const plainTextFiles: string[] = globby.sync(PLAIN_TEXT_FILE_MICROMATCH_PATTERN, {
    cwd: directoryPath,
  });
  const encodedFiles: string[] = globby.sync(ENCODED_FILE_MICROMATCH_PATTERN, {
    cwd: directoryPath,
  });

  describe('plaintext security labs content format', () => {
    plainTextFiles.forEach((file) => {
      it(`should have non-empty string content in file: ${file}`, () => {
        const filePath = path.join(directoryPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        expect(typeof content).toBe('string');
        expect(content.trim().length).toBeGreaterThan(0);
      });
    });

    plainTextFiles.forEach((file) => {
      it(`should have title and slug defined in yaml header: ${file}`, () => {
        const filePath = path.join(directoryPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        const split = content.split('---');
        const yamlString = split[1];
        const article = split[2];
        const parsed = yaml.load(yamlString) as {
          slug: string;
          title: string;
          date: string;
          description: string;
          author: Array<{ slug: string }>;
          image: string;
          category: Array<{ slug: string }>;
        };

        const slug = parsed.slug;
        const title = parsed.title;
        const date = parsed.date;
        const description = parsed.description;
        const author = parsed.author;
        const image = parsed.image;
        const category = parsed.category;
        expect(slug).toBeDefined();
        expect(title).toBeDefined();
        expect(typeof slug).toBe('string');
        expect(typeof title).toBe('string');
        expect(slug.trim().length).toBeGreaterThan(0);
        expect(title.trim().length).toBeGreaterThan(0);
        expect(date).toBeDefined();
        expect(typeof date).toBe('string');
        expect(date).toMatch(isoDateRegex);
        expect(description).toBeDefined();
        expect(author).toBeDefined();
        expect(Array.isArray(author)).toBe(true);
        expect(image).toBeDefined();
        expect(typeof image).toBe('string');
        expect(image.trim().length).toBeGreaterThan(0);
        expect(category).toBeDefined();

        expect(article).toBeDefined();
        expect(typeof article).toBe('string');
      });
    });

    plainTextFiles.forEach((file) => {
      it(`article should come after yaml definition: ${file}`, () => {
        const filePath = path.join(directoryPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        const split = content.split('---');
        const article = split[2];

        expect(article).toBeDefined();
        expect(typeof article).toBe('string');
        expect(article.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('encoded security labs content', () => {
    plainTextFiles.forEach((file) => {
      it(`corresponding encoded file exists for ${file}`, () => {
        /**
         * If this test fails, you probably forgot to run `yarn encode-security-labs-content` in x-pack/solutions/security/plugins/elastic_assistant/package.json
         */
        const encodedFileName = `${path.basename(file, path.extname(file))}.encoded.md`;
        const encodedFilePath = path.join(directoryPath, encodedFileName);

        // check if encoded file exists
        expect(encodedFiles).toContain(encodedFileName);
        expect(fs.existsSync(encodedFilePath)).toBe(true);
      });
    });

    encodedFiles.forEach((file) => {
      it(`corresponding plaintext file exists for ${file}`, () => {
        const plaintextFileName = `${path.basename(file, path.extname(file))}.md`;
        const plaintextFilePath = path.join(directoryPath, plaintextFileName);

        // check if plaintext file exists
        expect(encodedFiles).toContain(plaintextFileName);
        expect(fs.existsSync(plaintextFilePath)).toBe(true);
      });
    });

    plainTextFiles.forEach((file) => {
      it(`file ${file} was encoded correctly`, () => {
        const plainTextFilePath = path.join(directoryPath, file);
        const plainTextContent = fs.readFileSync(plainTextFilePath, 'utf-8');

        const encodedFileName = `${path.basename(file, path.extname(file))}.encoded.md`;
        const encodedFilePath = path.join(directoryPath, encodedFileName);

        // read encoded content
        const encodedContent = fs.readFileSync(encodedFilePath, 'utf-8');
        const decodedContent = decryptSecurityLabsContent(encodedContent);

        expect(decodedContent).toBe(plainTextContent);
      });
    });
  });
});
