/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import type { RuleLibraryImage, RuleLibraryOwner } from './types';

// A manifest is a few hundred bytes. Anything much bigger is not one, so it is never fully read.
export const MAX_MANIFEST_BYTES = 64 * 1024;
// Leaves room for the git protocol framing and compression around a manifest at its size limit.
export const MAX_MANIFEST_RESPONSE_BYTES = 1024 * 1024;
// Locations tried in order. The root is the target, the second one is where libraries keep it today.
export const MANIFEST_PATHS = ['manifest.yml', 'rules/manifest.yml'] as const;

const MAX_ALIAS_COUNT = 10;
const MAX_IMAGES = 10;
const MAX_NAME_LENGTH = 128;
const MAX_TITLE_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_VERSION_LENGTH = 64;
const MAX_OWNER_LENGTH = 128;
const MAX_IMAGE_FIELD_LENGTH = 512;

export interface RuleLibraryManifest {
  name?: string;
  title?: string;
  description?: string;
  version?: string;
  license?: string;
  owner?: RuleLibraryOwner;
  images?: RuleLibraryImage[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const text = (value: unknown, maxLength: number): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, maxLength) : undefined;

const parseOwner = (value: unknown): RuleLibraryOwner | undefined => {
  if (!isRecord(value)) return undefined;
  const type = text(value.type, MAX_OWNER_LENGTH);
  const github = text(value.github, MAX_OWNER_LENGTH);
  return type || github ? { ...(type ? { type } : {}), ...(github ? { github } : {}) } : undefined;
};

const parseImages = (value: unknown): RuleLibraryImage[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const images = value.slice(0, MAX_IMAGES).flatMap((icon): RuleLibraryImage[] => {
    if (!isRecord(icon)) return [];
    const src = text(icon.src, MAX_IMAGE_FIELD_LENGTH);
    if (!src) return [];
    const title = text(icon.title, MAX_IMAGE_FIELD_LENGTH);
    const size = text(icon.size, MAX_IMAGE_FIELD_LENGTH);
    const type = text(icon.type, MAX_IMAGE_FIELD_LENGTH);
    return [
      { src, ...(title ? { title } : {}), ...(size ? { size } : {}), ...(type ? { type } : {}) },
    ];
  });
  return images.length > 0 ? images : undefined;
};

/**
 * Reads the fields a library needs from a manifest.yml in the Fleet integration manifest format.
 * Unknown fields are ignored and every value is bounded, because the file comes from a remote source.
 */
export const parseManifest = (data: Buffer): RuleLibraryManifest => {
  if (data.length > MAX_MANIFEST_BYTES) {
    throw new Error(`The manifest is larger than ${MAX_MANIFEST_BYTES} bytes`);
  }

  let document: unknown;
  try {
    document = parseYaml(data.toString('utf8'), { maxAliasCount: MAX_ALIAS_COUNT });
  } catch (error) {
    throw new Error(
      `The manifest is not valid YAML: ${error instanceof Error ? error.message : ''}`
    );
  }
  if (!isRecord(document)) {
    throw new Error('The manifest is not a YAML mapping');
  }

  const license = isRecord(document.source) ? text(document.source.license, MAX_NAME_LENGTH) : '';
  const manifest: RuleLibraryManifest = {
    name: text(document.name, MAX_NAME_LENGTH),
    title: text(document.title, MAX_TITLE_LENGTH),
    description: text(document.description, MAX_DESCRIPTION_LENGTH),
    version: text(String(document.version ?? ''), MAX_VERSION_LENGTH),
    license: license || undefined,
    owner: parseOwner(document.owner),
    images: parseImages(document.icons),
  };

  return Object.fromEntries(
    Object.entries(manifest).filter(([, value]) => value !== undefined)
  ) as RuleLibraryManifest;
};
