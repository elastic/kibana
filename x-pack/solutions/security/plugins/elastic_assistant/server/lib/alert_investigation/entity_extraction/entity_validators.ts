/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservableTypeKey } from '../types';

/**
 * Entity Validators
 *
 * Problem: ECS field mappings trust input data without validation
 * - Invalid IPs passed to case matching (false negatives)
 * - Malformed hashes create orphaned entities
 * - Empty/whitespace-only values pollute case observables
 *
 * Solution: Validate extracted entities before using them
 * - Only well-formed entities enter the pipeline
 * - Prevents downstream matching errors
 * - Improves case observable quality
 */

export const ENTITY_VALIDATORS: Record<ObservableTypeKey, (value: string) => boolean> = {
  ipv4: (v) => {
    // Basic IPv4 validation: 4 octets, each 0-255
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return false;

    const octets = v.split('.');
    return octets.every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  },

  ipv6: (v) => {
    // IPv6 validation: 8 groups of hex (with :: compression allowed)
    if (v === '::') return true; // All zeros
    if (v.startsWith('::') || v.endsWith('::')) {
      // Compressed at start/end
      return /^::([0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4}$|^([0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4}::$/i.test(
        v
      );
    }
    if (v.includes('::')) {
      // Compressed in middle
      const parts = v.split('::');
      if (parts.length !== 2) return false;
      return /^([0-9a-f]{1,4}:)*[0-9a-f]{1,4}$/i.test(parts[0] + ':' + parts[1]);
    }
    // Full notation
    return /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i.test(v);
  },

  hostname: (v) => {
    // RFC 1123 hostname validation
    // - 1-253 chars total
    // - Labels: 1-63 chars, alphanumeric + hyphen (not start/end with hyphen)
    // - Case insensitive
    if (v.length === 0 || v.length > 253) return false;

    const labels = v.split('.');
    return labels.every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)
    );
  },

  user: (v) => {
    // User validation: non-empty, reasonable length, no control chars
    return (
      v.trim().length > 0 &&
      v.length <= 256 &&
      !/[\x00-\x1f\x7f]/.test(v) // No control characters
    );
  },

  file_hash: (v) => {
    // Hash validation: hex string, reasonable length (permissive for various hash types)
    // Accepts MD5 (32), SHA1 (40), SHA256 (64), SHA512 (128) and variations
    return v.length >= 8 && v.length <= 128 && /^[a-f0-9]+$/i.test(v);
  },

  file_path: (v) => {
    // File path validation: non-empty, reasonable length
    // Accepts both Unix (/) and Windows (\) paths
    return v.trim().length > 0 && v.length <= 4096 && !/[\x00-\x1f]/.test(v);
  },

  url: (v) => {
    // Basic URL validation
    try {
      new URL(v); // Throws if invalid
      return v.length <= 2048; // Reasonable URL length
    } catch {
      return false;
    }
  },

  domain: (v) => {
    // Domain name validation (similar to hostname but allows wildcards)
    if (v.length === 0 || v.length > 253) return false;

    // Allow leading wildcard (*.example.com)
    const normalized = v.startsWith('*.') ? v.slice(2) : v;

    const labels = normalized.split('.');
    return (
      labels.length >= 2 && // At least domain.tld
      labels.every(
        (label) =>
          label.length > 0 &&
          label.length <= 63 &&
          /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)
      )
    );
  },

  email: (v) => {
    // Basic email validation (RFC 5322 simplified)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 320; // Max email length
  },

  agent_id: (v) => {
    // Elastic Agent ID validation: UUID format or custom agent ID
    // Permissive: accepts UUID or any non-empty reasonable string
    return (
      v.trim().length > 0 &&
      v.length <= 256 &&
      !/[\x00-\x1f]/.test(v) // No control characters
    );
  },

  process: (v) => {
    // Process name validation: non-empty, reasonable length
    return v.trim().length > 0 && v.length <= 1024 && !/[\x00-\x1f]/.test(v);
  },

  registry: (v) => {
    // Windows registry path validation
    return v.trim().length > 0 && v.length <= 4096;
  },

  service: (v) => {
    // Service name validation
    return v.trim().length > 0 && v.length <= 256 && !/[\x00-\x1f]/.test(v);
  },
};

/**
 * Validates an entity value against its type
 * Returns true if valid, false if should be filtered out
 */
export function validateEntity(typeKey: ObservableTypeKey, value: string): boolean {
  const validator = ENTITY_VALIDATORS[typeKey];

  // No validator defined → accept (permissive fallback)
  if (!validator) return true;

  return validator(value);
}
