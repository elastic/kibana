/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  WebCrawler,
  WebCrawlerConfig,
  WebCrawlerDomain,
} from '../../../../common/types/web_crawlers';
import { useCreateWebCrawler } from '../../hooks/api/use_create_web_crawler';
import { useUpdateWebCrawler } from '../../hooks/api/use_update_web_crawler';

interface CreateWebCrawlerFlyoutProps {
  onClose: () => void;
  crawler?: WebCrawler;
}

export const domainsToLines = (domains: WebCrawlerDomain[]): string =>
  domains
    .flatMap((domain) => (domain.seed_urls?.length ? domain.seed_urls : [domain.url]))
    .join('\n');

const DEFAULT_MAX_CRAWL_DEPTH = 10;

export const parseDomainUrls = (
  value: string
): { domains: WebCrawlerDomain[]; invalid: string[] } => {
  const domains: WebCrawlerDomain[] = [];
  const invalid: string[] = [];
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      try {
        const url = new URL(line);
        if (!['http:', 'https:'].includes(url.protocol)) {
          invalid.push(line);
          return;
        }
        const origin = `${url.protocol}//${url.host}`;
        const isOriginOnly = url.pathname === '/' && !url.search && !url.hash;
        const domain = domains.find((candidate) => candidate.url === origin);
        const seedUrl = isOriginOnly ? undefined : url.toString();
        if (domain) {
          if (seedUrl) domain.seed_urls = [...(domain.seed_urls ?? []), seedUrl];
        } else {
          domains.push({ url: origin, ...(seedUrl ? { seed_urls: [seedUrl] } : {}) });
        }
      } catch {
        invalid.push(line);
      }
    });
  return { domains, invalid };
};

export const CreateWebCrawlerFlyout: React.FC<CreateWebCrawlerFlyoutProps> = ({
  onClose,
  crawler,
}) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const [name, setName] = useState(crawler?.name ?? '');
  const [outputIndex, setOutputIndex] = useState(crawler?.output_index ?? '');
  const [domainUrls, setDomainUrls] = useState(crawler ? domainsToLines(crawler.domains) : '');
  const [schedule, setSchedule] = useState(crawler?.schedule ?? '');
  const [maxCrawlDepth, setMaxCrawlDepth] = useState(
    crawler?.max_crawl_depth ?? DEFAULT_MAX_CRAWL_DEPTH
  );
  const [submitted, setSubmitted] = useState(false);
  const create = useCreateWebCrawler(onClose);
  const update = useUpdateWebCrawler(crawler?.id ?? '', onClose);
  const { mutate, isLoading, error } = crawler ? update : create;

  const { domains, invalid } = parseDomainUrls(domainUrls);
  const nameInvalid = submitted && name.trim().length === 0;
  const indexInvalid = submitted && outputIndex.trim().length === 0;
  const domainsInvalid = (submitted && domains.length === 0) || invalid.length > 0;

  const submit = () => {
    setSubmitted(true);
    if (name.trim().length === 0 || outputIndex.trim().length === 0 || domains.length === 0) {
      return;
    }
    if (invalid.length > 0) {
      return;
    }
    const config: WebCrawlerConfig = {
      name: name.trim(),
      output_index: outputIndex.trim(),
      domains,
      schedule: schedule.trim() || undefined,
      max_crawl_depth: maxCrawlDepth,
    };
    mutate(config);
  };

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      size="m"
      data-test-subj="serverlessSearchCreateWebCrawlerFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            {crawler
              ? i18n.translate('xpack.serverlessSearch.webCrawlers.editFlyout.title', {
                  defaultMessage: 'Edit web crawler {name}',
                  values: { name: crawler.name },
                })
              : i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.title', {
                  defaultMessage: 'Create an Elastic managed web crawler',
                })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.description', {
              defaultMessage:
                'Elastic runs the crawler for you. It discovers pages starting from the URLs you provide and indexes their content into the index below.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" onSubmit={(event) => event.preventDefault()}>
          <EuiFormRow
            label={i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            isInvalid={nameInvalid}
            error={i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.nameRequired', {
              defaultMessage: 'A name is required',
            })}
          >
            <EuiFieldText
              data-test-subj="serverlessSearchWebCrawlerNameInput"
              value={name}
              onChange={(event) => setName(event.target.value)}
              isInvalid={nameInvalid}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.indexLabel', {
              defaultMessage: 'Index name',
            })}
            helpText={i18n.translate(
              'xpack.serverlessSearch.webCrawlers.createFlyout.indexHelpText',
              { defaultMessage: 'The index is created when it does not exist yet.' }
            )}
            isInvalid={indexInvalid}
            error={i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.indexRequired', {
              defaultMessage: 'An index name is required',
            })}
          >
            <EuiFieldText
              data-test-subj="serverlessSearchWebCrawlerIndexInput"
              value={outputIndex}
              onChange={(event) => setOutputIndex(event.target.value)}
              isInvalid={indexInvalid}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.domainsLabel', {
              defaultMessage: 'URLs to crawl',
            })}
            helpText={i18n.translate(
              'xpack.serverlessSearch.webCrawlers.createFlyout.domainsHelpText',
              {
                defaultMessage:
                  'One URL per line. The crawler stays within the domain of each URL and uses URLs with a path as entry points.',
              }
            )}
            isInvalid={domainsInvalid}
            error={
              invalid.length > 0
                ? i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.domainsInvalid', {
                    defaultMessage: 'Not a valid http(s) URL: {urls}',
                    values: { urls: invalid.join(', ') },
                  })
                : i18n.translate(
                    'xpack.serverlessSearch.webCrawlers.createFlyout.domainsRequired',
                    { defaultMessage: 'At least one URL is required' }
                  )
            }
          >
            <EuiTextArea
              data-test-subj="serverlessSearchWebCrawlerDomainsInput"
              value={domainUrls}
              onChange={(event) => setDomainUrls(event.target.value)}
              placeholder={'https://www.example.com\nhttps://www.example.com/blog'}
              isInvalid={domainsInvalid}
              rows={4}
            />
          </EuiFormRow>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.serverlessSearch.webCrawlers.createFlyout.scheduleLabel',
                  { defaultMessage: 'Crawl schedule (cron)' }
                )}
                helpText={i18n.translate(
                  'xpack.serverlessSearch.webCrawlers.createFlyout.scheduleHelpText',
                  {
                    defaultMessage:
                      'Optional. For example "0 2 * * *" crawls every day at 02:00 UTC. Without a schedule you start crawls manually.',
                  }
                )}
              >
                <EuiFieldText
                  data-test-subj="serverlessSearchWebCrawlerScheduleInput"
                  value={schedule}
                  onChange={(event) => setSchedule(event.target.value)}
                  placeholder="0 2 * * *"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.serverlessSearch.webCrawlers.createFlyout.maxDepthLabel',
                  { defaultMessage: 'Maximum crawl depth' }
                )}
              >
                <EuiFieldNumber
                  data-test-subj="serverlessSearchWebCrawlerMaxDepthInput"
                  value={maxCrawlDepth}
                  min={1}
                  max={100}
                  onChange={(event) =>
                    setMaxCrawlDepth(Number(event.target.value) || DEFAULT_MAX_CRAWL_DEPTH)
                  }
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
        {error ? (
          <>
            <EuiSpacer />
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="error"
              title={i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.error', {
                defaultMessage: 'The web crawler could not be saved',
              })}
              text={(error as { body?: { message?: string } }).body?.message ?? String(error)}
            />
          </>
        ) : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="serverlessSearchCreateWebCrawlerCancelButton"
              onClick={onClose}
            >
              {i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="serverlessSearchCreateWebCrawlerSubmitButton"
              fill
              isLoading={isLoading}
              onClick={submit}
            >
              {crawler
                ? i18n.translate('xpack.serverlessSearch.webCrawlers.editFlyout.submit', {
                    defaultMessage: 'Save changes',
                  })
                : i18n.translate('xpack.serverlessSearch.webCrawlers.createFlyout.submit', {
                    defaultMessage: 'Create web crawler',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
