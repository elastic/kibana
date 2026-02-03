/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';

export interface AppError extends Error {
  body: {
    message: string;
  };
}

export interface KibanaError extends AppError {
  body: {
    message: string;
    statusCode: number;
  };
}

export interface SecurityAppError extends AppError {
  body: {
    message: string;
    status_code: number;
  };
}

export const isKibanaError = (error: unknown): error is KibanaError =>
  has('message', error) && has('body.message', error) && has('body.statusCode', error);

export const isSecurityAppError = (error: unknown): error is SecurityAppError =>
  has('message', error) && has('body.message', error) && has('body.status_code', error);

export const isAppError = (error: unknown): error is AppError =>
  isKibanaError(error) || isSecurityAppError(error);

export const isNotFoundError = (error: unknown) =>
  (isKibanaError(error) && error.body.statusCode === 404) ||
  (isSecurityAppError(error) && error.body.status_code === 404);
