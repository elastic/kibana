/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { KbnClient } from '@kbn/test';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import pMap from 'p-map';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { ToolingLog } from '@kbn/tooling-log';
import { randomPolicyIdGenerator } from '../common/random_policy_id_generator';
import { ExceptionsListItemGenerator } from '../../../common/endpoint/data_generators/exceptions_list_item_generator';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  isArtifactByPolicy,
} from '../../../common/endpoint/service/artifacts';
import { ensureArtifactListExists } from '../common/endpoint_artifact_services';
import { EndpointDocGenerator } from '../../../common/endpoint/generate_data';
import { ENDPOINT_ALERTS_INDEX } from '../common/constants';

export const cli = () => {
  run(
    async (options) => {
      try {
        const { alertsIndexed } = await createCustomYaraSignatures(options);
        const alertSuffix =
          options.flags.withAlerts && alertsIndexed
            ? ` and matching memory-signature alerts indexed to ${ENDPOINT_ALERTS_INDEX}`
            : '';
        options.log.success(
          `${options.flags.count} endpoint custom YARA signatures created${alertSuffix}`
        );
      } catch (e) {
        options.log.error(e);
        throw createFailError(e.message);
      }
    },
    {
      description: 'Load Endpoint Custom YARA Signatures',
      flags: {
        string: ['kibana', 'elasticsearch'],
        boolean: ['withAlerts'],
        default: {
          count: 10,
          kibana: 'http://elastic:changeme@127.0.0.1:5601',
          elasticsearch: 'http://elastic:changeme@127.0.0.1:9200',
          withAlerts: true,
        },
        help: `
        Requires xpack.securitySolution.enableExperimental.customYaraSignaturesEnabled feature flag to be enabled.

        --count            Number of custom YARA signatures to create. Default: 10
        --kibana           The URL to kibana including credentials. Default: http://elastic:changeme@127.0.0.1:5601
        --elasticsearch    The URL to elasticsearch including credentials. Default: http://elastic:changeme@127.0.0.1:9200
        --withAlerts       Index a matching memory-signature alert per created signature so CYS highlighted fields can be tested. Default: true
      `,
      },
    }
  );
};

class CustomYaraSignatureDataLoaderError extends Error {
  constructor(message: string, public readonly meta: unknown) {
    super(message);
  }
}

const handleThrowHttpError = (err: Error): never => {
  throw new CustomYaraSignatureDataLoaderError(err.message, err);
};

const extractFirstYaraRuleName = (yaraText: string): string | undefined => {
  const match = yaraText.match(/^\s*rule\s+([A-Za-z_][\w]*)/m);
  return match?.[1];
};

const getYaraRuleText = (item: ExceptionListItemSchema): string | undefined => {
  const [entry] = item.entries;
  if (entry && 'value' in entry && typeof entry.value === 'string') {
    return entry.value;
  }
  return undefined;
};

const indexMatchingMemoryAlerts = async ({
  esClient,
  items,
  log,
}: {
  esClient: Client;
  items: ExceptionListItemSchema[];
  log: ToolingLog;
}): Promise<boolean> => {
  const generator = new EndpointDocGenerator();
  const alerts = items.map((item) => {
    const yaraText = getYaraRuleText(item);
    const ruleName = (yaraText && extractFirstYaraRuleName(yaraText)) || item.name;

    return generator.generateMemoryAlert({
      customYaraSignature: {
        entry_id: item.id,
        entry_name: item.name,
        rule_identifier: ruleName,
      },
    });
  });

  try {
    const response = await esClient.bulk({
      refresh: 'wait_for',
      body: alerts.flatMap((doc) => [{ create: { _index: ENDPOINT_ALERTS_INDEX } }, doc]),
    });

    if (response.errors) {
      const firstError = response.items.find((item) => item.create?.error)?.create?.error;
      log.warning(
        `Some Custom YARA Signature alerts failed to index${
          firstError ? `: ${firstError.type} ${firstError.reason}` : ''
        }`
      );
      return false;
    }

    log.info(
      `Indexed ${alerts.length} memory-signature alerts to ${ENDPOINT_ALERTS_INDEX} with matching CYS entry_id values`
    );
    return true;
  } catch (err) {
    log.warning(
      `Failed to index Custom YARA Signature alerts to ${ENDPOINT_ALERTS_INDEX}. Ensure the endpoint alerts data stream exists (for example by running resolver_generator). ${err.message}`
    );
    return false;
  }
};

const createCustomYaraSignatures = async ({
  flags,
  log,
}: Parameters<RunFn>[0]): Promise<{ alertsIndexed: boolean }> => {
  const generator = new ExceptionsListItemGenerator();
  const kbn = new KbnClient({ log, url: flags.kibana as string });

  await ensureArtifactListExists(kbn, 'customYaraSignatures');

  const randomPolicyId = await randomPolicyIdGenerator(kbn, log);

  const createdItems = await pMap(
    Array.from({ length: flags.count as unknown as number }),
    async () => {
      const body = generator.generateCustomYaraSignatureForCreate();

      if (isArtifactByPolicy(body)) {
        const nmExceptions = generator.randomN(3) || 1;
        body.tags = [
          // Existing tags that are not policy tags
          ...body.tags.filter((tag) => !tag.startsWith(BY_POLICY_ARTIFACT_TAG_PREFIX)),

          // New policy tags
          ...Array.from(
            { length: nmExceptions },
            () => `${BY_POLICY_ARTIFACT_TAG_PREFIX}${randomPolicyId()}`
          ),
        ];
      }

      const response = await kbn
        .request<ExceptionListItemSchema>({
          method: 'POST',
          path: EXCEPTION_LIST_ITEM_URL,
          body,
        })
        .catch((e) => handleThrowHttpError(e));

      return response.data;
    },
    { concurrency: 10 }
  );

  if (!flags.withAlerts) {
    return { alertsIndexed: false };
  }

  const esClient = new Client({
    node: flags.elasticsearch as string,
    Connection: HttpConnection,
  });

  const alertsIndexed = await indexMatchingMemoryAlerts({ esClient, items: createdItems, log });
  return { alertsIndexed };
};
