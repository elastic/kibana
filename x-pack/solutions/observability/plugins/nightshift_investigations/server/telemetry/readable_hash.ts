/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

// 64 short, unambiguous words, so one byte-sized slice of a digest picks one word.
const WORDS = [
  'amber',
  'apple',
  'arrow',
  'aspen',
  'badge',
  'basil',
  'beach',
  'birch',
  'bison',
  'blaze',
  'bloom',
  'brook',
  'cedar',
  'cider',
  'cliff',
  'cloud',
  'comet',
  'coral',
  'crane',
  'daisy',
  'delta',
  'drift',
  'eagle',
  'ember',
  'falcon',
  'fern',
  'flint',
  'frost',
  'glade',
  'grove',
  'harbor',
  'hazel',
  'heron',
  'iris',
  'jade',
  'juniper',
  'kayak',
  'lemon',
  'lilac',
  'lotus',
  'maple',
  'marsh',
  'meadow',
  'mint',
  'moss',
  'nectar',
  'oasis',
  'olive',
  'otter',
  'pearl',
  'pine',
  'plum',
  'quartz',
  'raven',
  'reef',
  'river',
  'sage',
  'spruce',
  'tulip',
  'violet',
  'willow',
  'wren',
  'yarrow',
  'zephyr',
] as const;

const WORD_COUNT = 4;

/**
 * Maps a value to a stable, one-way phrase such as `amber-otter-falcon-maple`. It lets telemetry
 * group and compare identifiers across events without carrying the identifier itself, and stays
 * readable enough to spot in a dashboard. Four words of 64 give 24 bits, so two ids in a large
 * set can occasionally share a phrase; it is a label, not a unique key.
 */
export const toReadableHash = (value: string): string => {
  const digest = createHash('sha256').update(value).digest();
  return Array.from({ length: WORD_COUNT }, (_, i) => WORDS[digest[i] % WORDS.length]).join('-');
};
