/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes, publicEncrypt, createCipheriv, constants } from 'crypto';

export const DIAGNOSTIC_QUERIES_ENCRYPT_VERSION = 'v1';

/**
 * Represents an encrypted field
 */
export interface EncryptedField {
  version: string;
  keyId: string;
  encryptedDEK: string;
  iv: string;
  ciphertext: string;
  authTag: string;
}

/**
 * Generate random 256-bit Data Encryption Key (DEK)
 *
 * @returns 256-bit random key
 */
export function generateDEK(): Buffer {
  return randomBytes(32);
}

/**
 * Encrypt DEK with RSA public key using OAEP padding
 *
 * @param dek - Data Encryption Key to encrypt
 * @param publicKeyPEM - RSA public key in PEM format
 * @returns Encrypted DEK (512 bytes for RSA-4096)
 */
export function encryptDEKWithRSA(dek: Buffer, publicKeyPEM: string): Buffer {
  return publicEncrypt(
    {
      key: publicKeyPEM,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    dek
  );
}

/**
 * Encrypt a field value using AES-256-GCM and return formatted string
 *
 * Format: `CURRENT_VERSION:{keyId}:{encryptedDEK}:{iv}:{ciphertext}:{authTag}`
 *
 * @param value - Field value to encrypt
 * @param dek - Data Encryption Key (ephemeral, one per query execution)
 * @param encryptedDEK - DEK encrypted with RSA public key
 * @param keyId - Identifier for the RSA key pair used
 * @returns Formatted encrypted string
 */
export function encryptField(
  value: string,
  dek: Buffer,
  encryptedDEK: Buffer,
  keyId: string
): string {
  const { iv, ciphertext, authTag } = encryptFieldWithAES(value, dek);

  const parts = [
    DIAGNOSTIC_QUERIES_ENCRYPT_VERSION,
    keyId,
    encryptedDEK.toString('base64'),
    iv.toString('base64'),
    ciphertext.toString('base64'),
    authTag.toString('base64'),
  ];

  return parts.join(':');
}

/**
 * Encrypt field value with AES-256-GCM
 *
 * @param value - Field value to encrypt
 * @param dek - Data Encryption Key
 * @returns Object containing IV, ciphertext, and authentication tag
 */
function encryptFieldWithAES(
  value: string,
  dek: Buffer
): {
  iv: Buffer;
  ciphertext: Buffer;
  authTag: Buffer;
} {
  const iv = randomBytes(12); // 96-bit IV for GCM mode
  const cipher = createCipheriv('aes-256-gcm', dek, iv);

  let ciphertext = cipher.update(value, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return { iv, ciphertext, authTag };
}
