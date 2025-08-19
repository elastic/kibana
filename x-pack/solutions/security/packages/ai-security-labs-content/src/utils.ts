/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import crypto from 'crypto';

const key = crypto.createHash('sha256').update('ELASTIC').digest();
const keyUint8 = key as unknown as Uint8Array;

/**
 * Unsafe encryption function for security labs content.
 * @param text security labs content to encrypt
 * @returns Encrypted content as a hex string.
 */
export function encryptSecurityLabsContent(text: string): string {
  const cipher = crypto.createCipheriv('aes-256-ecb', keyUint8, null);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

/**
 * Decryption function for security labs content.
 * @param encrypted Encrypted security labs content as a hex string.
 * @returns Decrypted content as a string.
 */
export function decryptSecurityLabsContent(encrypted: string): string {
  const decipher = crypto.createDecipheriv('aes-256-ecb', keyUint8, null);
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}
