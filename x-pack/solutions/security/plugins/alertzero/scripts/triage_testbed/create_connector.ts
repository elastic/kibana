/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates the OpenAI-compatible connector (`.gen-ai`) that points to `fake_llm.ts`, or returns the one with
 * the same name. A second run with the same name creates nothing. The connector id is printed.
 *
 * Real models need no connector of ours: Kibana lists every Elastic Inference Service endpoint as a connector whose id
 * is the endpoint id, for example `.anthropic-claude-4.5-haiku-chat_completion`. (A `.inference` connector
 * created by hand fails, because it tries to create the endpoint, and EIS has already done so.)
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/create_connector_cli.js \
 *     --name "AZ fake LLM" [--url http://127.0.0.1:3099/v1/chat/completions] [--kibana http://localhost:5601]
 *   The user and password come from the variable ES_AUTH (default elastic:changeme, the local snapshot default).
 */

interface ConnectorArgs {
  name: string;
  url: string;
  kibana: string;
}

interface Connector {
  id: string;
  name: string;
}

const FLAGS: Readonly<Record<string, keyof ConnectorArgs>> = {
  '--name': 'name',
  '--url': 'url',
  '--kibana': 'kibana',
};

export const parseArgs = (argv: readonly string[]): ConnectorArgs => {
  const args: Partial<ConnectorArgs> = {
    kibana: 'http://localhost:5601',
    url: 'http://127.0.0.1:3099/v1/chat/completions',
  };
  for (let i = 2; i < argv.length; i++) {
    const key = FLAGS[argv[i]];
    if (!key) throw new Error(`unknown argument ${argv[i]}`);
    args[key] = argv[++i];
  }
  if (!args.name) throw new Error('--name is required');
  return args as ConnectorArgs;
};

const call = async <T>(
  kibana: string,
  method: string,
  url: string,
  body?: Readonly<Record<string, unknown>>
): Promise<T> => {
  const auth = Buffer.from(process.env.ES_AUTH ?? 'elastic:changeme').toString('base64');
  const response = await fetch(`${kibana}${url}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(`${method} ${url} failed with ${response.status}: ${text.slice(0, 600)}`);
  return JSON.parse(text) as T;
};

const connectorBody = ({ name, url }: ConnectorArgs): Readonly<Record<string, unknown>> => ({
  name,
  connector_type_id: '.gen-ai',
  config: { apiProvider: 'Other', apiUrl: url, defaultModel: 'fake-haiku' },
  secrets: { apiKey: 'fake' },
});

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  const connectors = await call<Connector[]>(args.kibana, 'GET', '/api/actions/connectors');
  const existing = connectors.find((connector) => connector.name === args.name);
  if (existing) {
    process.stdout.write(
      `${JSON.stringify({ id: existing.id, name: existing.name, created: false })}\n`
    );
    return;
  }
  const created = await call<Connector>(
    args.kibana,
    'POST',
    '/api/actions/connector',
    connectorBody(args)
  );
  process.stdout.write(
    `${JSON.stringify({ id: created.id, name: created.name, created: true })}\n`
  );
};
