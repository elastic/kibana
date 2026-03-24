/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NodeType } from './feature_feedback_button';
import { getSurveyFeedbackURL } from './feature_feedback_button';

describe('getSurveyFeedbackURL', () => {
  const formUrl = 'https://ela.st/foo';

  it('should return the correct URL without any parameters', () => {
    const expectedUrl = formUrl;
    const actualUrl = getSurveyFeedbackURL({ formUrl });
    expect(actualUrl).toBe(expectedUrl);
  });

  it('should append kibana version parameter correctly', () => {
    const kibanaVersion = '7.15.0';
    const expectedUrl = `${formUrl}?version=${kibanaVersion}`;
    const actualUrl = getSurveyFeedbackURL({ formUrl, kibanaVersion });
    expect(actualUrl).toBe(expectedUrl);
  });

  it('should append deployment type parameter correctly for cloud', () => {
    const isCloudEnv = true;
    const expectedUrl = `${formUrl}?deployment_type=Elastic+Cloud`;
    const actualUrl = getSurveyFeedbackURL({ formUrl, isCloudEnv });
    expect(actualUrl).toBe(expectedUrl);
  });

  it('should append sanitized path parameter correctly', () => {
    const sanitizedPath = '/path/to/something';
    const expectedUrl = `${formUrl}?path=%2Fpath%2Fto%2Fsomething`;
    const actualUrl = getSurveyFeedbackURL({ formUrl, sanitizedPath });
    expect(actualUrl).toBe(expectedUrl);
  });

  it('should append ML job type parameter correctly for host', () => {
    const nodeType: NodeType = 'host';
    const expectedUrl = `${formUrl}?ml_job_type=Host+Anomalies`;
    const actualUrl = getSurveyFeedbackURL({ formUrl, nodeType });
    expect(actualUrl).toBe(expectedUrl);
  });

  it('should append ML job type parameter correctly for pod', () => {
    const nodeType: NodeType = 'pod';
    const expectedUrl = `${formUrl}?ml_job_type=Pod+Anomalies`;
    const actualUrl = getSurveyFeedbackURL({ formUrl, nodeType });
    expect(actualUrl).toBe(expectedUrl);
  });

  it('should ignore undefined parameters', () => {
    const kibanaVersion = '8.0.0';
    const sanitizedPath = '/path/to/something';
    const isCloudEnv = true;
    const expectedUrl = `${formUrl}?version=8.0.0&deployment_type=Elastic+Cloud&path=%2Fpath%2Fto%2Fsomething`;
    const actualUrl = getSurveyFeedbackURL({ formUrl, kibanaVersion, sanitizedPath, isCloudEnv });
    expect(actualUrl).toBe(expectedUrl);
  });

  it('should append deployment type parameter correctly for serverless', () => {
    const kibanaVersion = '8.0.0';
    const sanitizedPath = '/path/to/something';
    const isServerlessEnv = true;
    const expectedUrl = `${formUrl}?version=8.0.0&deployment_type=Serverless&path=%2Fpath%2Fto%2Fsomething`;
    const actualUrl = getSurveyFeedbackURL({
      formUrl,
      kibanaVersion,
      sanitizedPath,
      isServerlessEnv,
    });
    expect(actualUrl).toBe(expectedUrl);
  });

  it('should append deployment type parameter correctly for self-managed', () => {
    const kibanaVersion = '8.0.0';
    const isServerlessEnv = false;
    const isCloudEnv = false;
    const sanitizedPath = '/path/to/something';
    const expectedUrl = `${formUrl}?version=8.0.0&deployment_type=Self-Managed&path=%2Fpath%2Fto%2Fsomething`;
    const actualUrl = getSurveyFeedbackURL({
      formUrl,
      kibanaVersion,
      sanitizedPath,
      isServerlessEnv,
      isCloudEnv,
    });
    expect(actualUrl).toBe(expectedUrl);
  });
});
