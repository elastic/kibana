/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpResponse } from '@kbn/core/public';

import { ErrorCode } from './error_codes';

/**
 * These types track an API call's status and result
 * Each Status string corresponds to a possible status in a request's lifecycle
 */

export enum Status {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR,
}

export interface ErrorResponse {
  attributes?: {
    error_code?: ErrorCode;
    errors: string[];
  };
  error: string;
  message: string;
  statusCode: number;
}

export type HttpError = HttpResponse<ErrorResponse>;

export interface ApiSuccess<T> {
  data: T;
  error?: undefined;
  status: Status.SUCCESS;
}

export interface ApiPending<T> {
  data?: T;
  error?: undefined;
  status: Status.LOADING;
}

export interface ApiIdle<T> {
  data?: T;
  error?: undefined;
  status: Status.IDLE;
}

export interface ApiError {
  data?: undefined;
  error: HttpError;
  status: Status.ERROR;
}

export type ApiStatus<T> = ApiSuccess<T> | ApiPending<T> | ApiIdle<T> | ApiError;
