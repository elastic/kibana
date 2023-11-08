/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';
import Url from 'url';
import * as cheerio from 'cheerio';

export interface SessionParams {
  username: string;
  password: string;
  cloudEnv: CloudEnv;
  kbnHost: string;
  kbnVersion: string;
}

export type CloudEnv = 'qa' | 'staging' | 'production';

const envHosts: { [key: string]: string } = {
  qa: 'console.qa.cld.elstc.co',
  staging: 'staging.found.no',
  production: 'api.elastic-cloud.com',
};

const getSidCookie = (cookies: string[] | undefined) => {
  return cookies?.[0].toString().split(';')[0].split('sid=')[1] ?? '';
};

const getHostUrl = (env: CloudEnv, pathname?: string) => {
  return Url.format({
    protocol: 'https',
    hostname: envHosts[env],
    pathname,
  });
};

const createCloudSession = async (env: CloudEnv, email: string, password: string) => {
  const cloudLoginUrl = getHostUrl(env, '/api/v1/users/_login');
  const sessionResponse: AxiosResponse = await axios.request({
    url: cloudLoginUrl,
    method: 'post',
    data: {
      email,
      password,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    validateStatus: () => true,
    maxRedirects: 0,
  });
  return sessionResponse.data.token;
};

const createSAMLRequest = async (kbnUrl: string, kbnVersion: string) => {
  const samlResponse: AxiosResponse = await axios.request({
    url: kbnUrl + '/internal/security/login',
    method: 'post',
    data: {
      providerType: 'saml',
      providerName: 'cloud-saml-kibana',
      currentURL: kbnUrl + '/login?next=%2F"',
    },
    headers: {
      'kbn-version': kbnVersion,
      'x-elastic-internal-origin': 'Kibana',
      'content-type': 'application/json',
    },
    validateStatus: () => true,
    maxRedirects: 0,
  });
  const sid = getSidCookie(samlResponse.headers['set-cookie']);
  return { location: samlResponse.data.location, sid };
};

const createSAMLResponse = async (url: string, ecSession: string) => {
  const samlResponse = await axios.get(url, {
    headers: {
      Cookie: `ec_session=${ecSession}`,
    },
  });
  const $ = cheerio.load(samlResponse.data);
  const value = $('input').attr('value') ?? '';
  if (value.length === 0) {
    throw new Error('Failed to parse SAML response value');
  }
  return value;
};

const finishSAMLHandshake = async (
  kbnHost: string,
  samlResponse: string,
  cloudSessionSid: string
) => {
  const encodedResponse = encodeURIComponent(samlResponse);
  const authResponse: AxiosResponse = await axios.request({
    url: kbnHost + '/api/security/saml/callback',
    method: 'post',
    data: `SAMLResponse=${encodedResponse}`,
    headers: {
      Cookie: `sid=${cloudSessionSid}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    validateStatus: () => true,
    maxRedirects: 0,
  });

  return getSidCookie(authResponse.headers['set-cookie']);
};

export const createNewSAMLSession = async (params: SessionParams) => {
  const { username, password, cloudEnv, kbnHost, kbnVersion } = params;
  const ecSession = await createCloudSession(cloudEnv, username, password);
  const { location, sid } = await createSAMLRequest(kbnHost, kbnVersion);
  const samlResponse = await createSAMLResponse(location, ecSession);
  const cookie = await finishSAMLHandshake(kbnHost, samlResponse, sid);
  return { username, cookie };
};
