/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const HAS_DATA_FETCH_INTERVAL = 5000;

export function buildCreateStackCommand({
  templateUrl,
  stackName,
  streamName,
  encodedApiKey,
  elasticsearchUrl,
  metricsEnabled,
}: {
  templateUrl: string;
  stackName: string;
  streamName: string;
  encodedApiKey: string;
  elasticsearchUrl: string;
  metricsEnabled: boolean;
}) {
  const escapedElasticsearchUrl = elasticsearchUrl.replace(/\//g, '\\/');
  const escapedTemplateUrl = templateUrl.replace(/\//g, '\\/');

  return `
    aws cloudformation create-stack
      --stack-name ${stackName}
      --template-url ${escapedTemplateUrl}
      --parameters ParameterKey=FirehoseStreamName,ParameterValue=${streamName}
                   ParameterKey=ElasticEndpointURL,ParameterValue=${escapedElasticsearchUrl}
                   ParameterKey=ElasticAPIKey,ParameterValue=${encodedApiKey}
                   ParameterKey=EnableCloudWatchMetrics,ParameterValue=${metricsEnabled}
      --capabilities CAPABILITY_IAM
  `
    .trim()
    .replace(/\n/g, ' ')
    .replace(/\s\s+/g, ' ');
}

export function buildStackStatusCommand({ stackName }: { stackName: string }) {
  return `
    aws cloudformation describe-stacks
      --stack-name ${stackName}
      --query "Stacks[0].StackStatus"
  `
    .trim()
    .replace(/\n/g, ' ')
    .replace(/\s\s+/g, ' ');
}

export function buildCreateStackAWSConsoleURL({
  templateUrl,
  stackName,
  streamName,
  elasticsearchUrl,
  encodedApiKey,
  metricsEnabled,
}: {
  templateUrl: string;
  stackName: string;
  streamName: string;
  elasticsearchUrl: string;
  encodedApiKey: string;
  metricsEnabled: boolean;
}): string {
  const url = new URL('https://console.aws.amazon.com');
  const params = new URLSearchParams({
    templateURL: templateUrl,
    stackName,
    /**
     * 'param_' format is enforced by AWS
     * but template parameters are in CamelCase
     * which triggers the eslint rule.
     */
    /* eslint-disable @typescript-eslint/naming-convention */
    param_FirehoseStreamName: streamName,
    param_ElasticEndpointURL: elasticsearchUrl,
    param_ElasticAPIKey: encodedApiKey,
    param_EnableCloudWatchMetrics: String(metricsEnabled),
    /* eslint-enable @typescript-eslint/naming-convention */
  });

  url.pathname = '/cloudformation/home';
  url.hash = `/stacks/quickcreate?${params.toString()}`;

  return url.toString();
}
