/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-bitwise -- a bit array: addressing and hashing are bitwise by nature */

/** Bits set per ID, all inside one block. */
const BITS_PER_ID = 8;
/** 512 bits: one 64-byte cache line. */
const BLOCK_WORDS = 16;
/** Blocked filters need about a fifth more bits than plain ones for the same false positive rate. */
const BLOCKED_OVERHEAD = 1.2;

/**
 * A set of entity IDs that may answer "maybe" for an ID it never saw, never "no" for one it did.
 * Base scoring adds every entity it scores, so resolution can leave members that certainly have no
 * alerts out of its terms filter; a false positive only keeps one term too many.
 *
 * Each ID's bits sit in one 64-byte block, so a lookup reads one cache line. Sized for a 1% false
 * positive rate at the expected count, it takes about 1.4 MB per million IDs, where a `Set` of the
 * same strings takes over 100 MB. Past the expected count the rate rises gradually; it never drops
 * an ID.
 */
export class EntityIdBloomFilter {
  private readonly bits: Uint32Array;
  private readonly blocks: number;
  private added = 0;
  // The last ID's block offset and in-block hash, kept on the instance so hashing allocates nothing.
  private offset = 0;
  private blockHash = 0;

  private constructor(blocks: number) {
    this.blocks = blocks;
    this.bits = new Uint32Array(blocks * BLOCK_WORDS);
  }

  public static forCount(expected: number, falsePositiveRate = 0.01): EntityIdBloomFilter {
    const n = Math.max(1, expected);
    const bits = ((-n * Math.log(falsePositiveRate)) / (Math.LN2 * Math.LN2)) * BLOCKED_OVERHEAD;
    return new EntityIdBloomFilter(Math.max(1, Math.ceil(bits / (BLOCK_WORDS * 32))));
  }

  public add(id: string): void {
    this.hash(id);
    const start = this.blockHash & 511;
    const step = ((this.blockHash >>> 9) & 511) | 1;
    for (let k = 0; k < BITS_PER_ID; k++) {
      const bit = (start + k * step) & 511;
      this.bits[this.offset + (bit >>> 5)] |= 1 << (bit & 31);
    }
    this.added += 1;
  }

  public mightContain(id: string): boolean {
    this.hash(id);
    const start = this.blockHash & 511;
    const step = ((this.blockHash >>> 9) & 511) | 1;
    for (let k = 0; k < BITS_PER_ID; k++) {
      const bit = (start + k * step) & 511;
      if ((this.bits[this.offset + (bit >>> 5)] & (1 << (bit & 31))) === 0) {
        return false;
      }
    }
    return true;
  }

  /** How many IDs went in, counting repeats. */
  public get count(): number {
    return this.added;
  }

  /** Bytes held by the bit array. */
  public get bytes(): number {
    return this.bits.byteLength;
  }

  /** Two 32-bit FNV-1a hashes with different seeds: one picks the block, the other its bits. */
  private hash(id: string): void {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < id.length; i++) {
      const c = id.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619);
      h2 = Math.imul(h2 ^ c, 2246822507);
    }
    this.offset = ((h1 >>> 0) % this.blocks) * BLOCK_WORDS;
    this.blockHash = h2 >>> 0;
  }
}
