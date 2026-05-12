/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateKeyPairSync } from 'crypto';
import {
  generateDEK,
  encryptDEKWithRSA,
  encryptField,
  DIAGNOSTIC_QUERIES_ENCRYPT_VERSION,
} from './encryption';

describe('Security Solution - Health Diagnostic Encryption', () => {
  let publicKey: string;

  beforeAll(() => {
    const keyPair = generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    publicKey = keyPair.publicKey;
  });

  describe('generateDEK', () => {
    test('should generate a 256-bit (32-byte) key', () => {
      const dek = generateDEK();
      expect(dek).toBeInstanceOf(Buffer);
      expect(dek.length).toBe(32);
    });

    test('should generate different keys on each call', () => {
      const dek1 = generateDEK();
      const dek2 = generateDEK();
      expect(dek1).not.toEqual(dek2);
    });
  });

  describe('encryptDEKWithRSA', () => {
    test('should encrypt DEK with RSA-4096 public key', () => {
      const dek = generateDEK();
      const encryptedDEK = encryptDEKWithRSA(dek, publicKey);

      expect(encryptedDEK).toBeInstanceOf(Buffer);
      expect(encryptedDEK.length).toBe(512); // RSA-4096 produces 512-byte ciphertext
    });

    test('should produce different ciphertext for same DEK due to OAEP padding', () => {
      const dek = generateDEK();
      const encrypted1 = encryptDEKWithRSA(dek, publicKey);
      const encrypted2 = encryptDEKWithRSA(dek, publicKey);

      expect(encrypted1).not.toEqual(encrypted2);
    });

    test('should throw error with invalid public key', () => {
      const dek = generateDEK();
      const invalidKey = 'invalid-key';

      expect(() => {
        encryptDEKWithRSA(dek, invalidKey);
      }).toThrow();
    });
  });

  describe('encryptField', () => {
    test('should encrypt field value and return formatted string', () => {
      const dek = generateDEK();
      const encryptedDEK = encryptDEKWithRSA(dek, publicKey);
      const keyId = 'test-key-id';
      const value = 'sensitive-data';

      const encrypted = encryptField(value, dek, encryptedDEK, keyId);

      expect(typeof encrypted).toBe('string');

      // Verify format: DIAGNOSTIC_QUERIES_ENCRYPT_VERSION:{keyId}:{encryptedDEK}:{iv}:{ciphertext}:{authTag}
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(6);
      expect(parts[0]).toBe(DIAGNOSTIC_QUERIES_ENCRYPT_VERSION);
      expect(parts[1]).toBe(keyId);
      expect(parts[2].length).toBeGreaterThan(680); // Base64 encrypted DEK (~680 chars)
      expect(parts[3].length).toBeGreaterThan(0); // Base64 IV
      expect(parts[4].length).toBeGreaterThan(0); // Base64 ciphertext
      expect(parts[5].length).toBeGreaterThan(0); // Base64 auth tag
    });

    test('should produce different ciphertext for same value due to random IV', () => {
      const dek = generateDEK();
      const encryptedDEK = encryptDEKWithRSA(dek, publicKey);
      const keyId = 'test-key-id';
      const value = 'sensitive-data';

      const encrypted1 = encryptField(value, dek, encryptedDEK, keyId);
      const encrypted2 = encryptField(value, dek, encryptedDEK, keyId);

      // Different IVs produce different ciphertext
      expect(encrypted1).not.toEqual(encrypted2);

      // But they should have the same encrypted DEK
      const parts1 = encrypted1.split(':');
      const parts2 = encrypted2.split(':');
      expect(parts1[2]).toBe(parts2[2]);
    });

    test('should handle empty string', () => {
      const dek = generateDEK();
      const encryptedDEK = encryptDEKWithRSA(dek, publicKey);
      const keyId = 'test-key-id';

      const encrypted = encryptField('', dek, encryptedDEK, keyId);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(6);
      expect(parts[0]).toBe(DIAGNOSTIC_QUERIES_ENCRYPT_VERSION);
    });

    test('should handle long strings', () => {
      const dek = generateDEK();
      const encryptedDEK = encryptDEKWithRSA(dek, publicKey);
      const keyId = 'test-key-id';
      const longValue = 'a'.repeat(50_000);

      const encrypted = encryptField(longValue, dek, encryptedDEK, keyId);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(6);
      expect(parts[4].length).toBeGreaterThan(50_000);
    });

    test('should handle special characters', () => {
      const dek = generateDEK();
      const encryptedDEK = encryptDEKWithRSA(dek, publicKey);
      const keyId = 'test-key-id';
      const specialValue = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`\n\t\r';

      const encrypted = encryptField(specialValue, dek, encryptedDEK, keyId);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(6);
    });

    test('should handle unicode characters', () => {
      const dek = generateDEK();
      const encryptedDEK = encryptDEKWithRSA(dek, publicKey);
      const keyId = 'test-key-id';
      const unicodeValue = '你好世界 🌍 Здравствуй мир';

      const encrypted = encryptField(unicodeValue, dek, encryptedDEK, keyId);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(6);
    });
  });

  describe('full encryption flow', () => {
    test('should encrypt and format field correctly', () => {
      const keyId = 'rsa-keypair-v1-2025-q4';
      const fieldValue = 'admin-user';

      // Step 1: Generate DEK
      const dek = generateDEK();

      // Step 2: Encrypt DEK with RSA public key
      const encryptedDEK = encryptDEKWithRSA(dek, publicKey);

      // Step 3: Encrypt field value
      const encrypted = encryptField(fieldValue, dek, encryptedDEK, keyId);

      // Verify encrypted string format
      expect(encrypted).toMatch(
        new RegExp(`^${DIAGNOSTIC_QUERIES_ENCRYPT_VERSION}:[^:]+:[^:]+:[^:]+:[^:]+:[^:]+$`)
      );

      // Verify parts
      const parts = encrypted.split(':');
      expect(parts[0]).toBe(DIAGNOSTIC_QUERIES_ENCRYPT_VERSION);
      expect(parts[1]).toBe(keyId);

      expect(() => Buffer.from(parts[2], 'base64')).not.toThrow();
      expect(() => Buffer.from(parts[3], 'base64')).not.toThrow();
      expect(() => Buffer.from(parts[4], 'base64')).not.toThrow();
      expect(() => Buffer.from(parts[5], 'base64')).not.toThrow();
    });
  });
});
