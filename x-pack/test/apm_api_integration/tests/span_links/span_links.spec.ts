/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EntityArrayIterable } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateSpanLinksData } from './data_generator';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  registry.when('contains linked children', { config: 'basic', archives: [] }, () => {
    let ids: ReturnType<typeof generateSpanLinksData>['ids'];

    before(async () => {
      const spanLinksData = generateSpanLinksData();

      ids = spanLinksData.ids;

      await synthtraceEsClient.index(
        new EntityArrayIterable(spanLinksData.apmFields.producerInternalOnly).merge(
          new EntityArrayIterable(spanLinksData.apmFields.producerExternalOnly),
          new EntityArrayIterable(spanLinksData.apmFields.producerConsumer),
          new EntityArrayIterable(spanLinksData.apmFields.producerMultiple)
        )
      );
    });

    after(() => synthtraceEsClient.clean());

    describe('Span links count on traces', () => {
      async function fetchTraces({
        traceId,
        entryTransactionId,
      }: {
        traceId: string;
        entryTransactionId: string;
      }) {
        return await apmApiClient.readUser({
          endpoint: `GET /internal/apm/traces/{traceId}`,
          params: {
            path: { traceId },
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
              entryTransactionId,
            },
          },
        });
      }

      describe('producer-internal-only trace', () => {
        let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
        before(async () => {
          const tracesResponse = await fetchTraces({
            traceId: ids.producerInternalOnly.traceId,
            entryTransactionId: ids.producerInternalOnly.transactionAId,
          });
          traces = tracesResponse.body;
        });

        it('contains two incoming links on Span A', () => {
          const spanADoc = traces.items.find(
            (item) => item.id === ids.producerInternalOnly.spanAId
          );
          expect(spanADoc).to.not.be(undefined);
          expect(spanADoc?.spanLinksCount).to.eql({
            linkedParents: 0,
            linkedChildren: 2,
          });
        });
      });

      describe('producer-external-only trace', () => {
        let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
        before(async () => {
          const tracesResponse = await fetchTraces({
            traceId: ids.producerExternalOnly.traceId,
            entryTransactionId: ids.producerExternalOnly.transactionBId,
          });
          traces = tracesResponse.body;
        });
        it('contains one incoming link on Transaction B', () => {
          const transactionBDoc = traces.items.find(
            (item) => item.id === ids.producerExternalOnly.transactionBId
          );
          expect(transactionBDoc).to.not.be(undefined);
          expect(transactionBDoc?.spanLinksCount).to.eql({
            linkedParents: 0,
            linkedChildren: 1,
          });
        });

        it('contains one incoming link and one outgoing link on Span B', () => {
          const spanBDoc = traces.items.find(
            (item) => item.id === ids.producerExternalOnly.spanBId
          );
          expect(spanBDoc).to.not.be(undefined);
          expect(spanBDoc?.spanLinksCount).to.eql({
            linkedParents: 1,
            linkedChildren: 1,
          });
        });
      });

      describe('producer-consumer trace', () => {
        let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
        before(async () => {
          const tracesResponse = await fetchTraces({
            traceId: ids.producerConsumer.traceId,
            entryTransactionId: ids.producerConsumer.transactionCId,
          });
          traces = tracesResponse.body;
        });

        it('contains one incoming link and three outgoing links on Transaction C', () => {
          const transactionCDoc = traces.items.find(
            (item) => item.id === ids.producerConsumer.transactionCId
          );
          expect(transactionCDoc).to.not.be(undefined);
          expect(transactionCDoc?.spanLinksCount).to.eql({
            linkedParents: 3,
            linkedChildren: 1,
          });
        });

        it('contains one incoming link on Span C', () => {
          const spanCDoc = traces.items.find((item) => item.id === ids.producerConsumer.spanCId);
          expect(spanCDoc).to.not.be(undefined);
          expect(spanCDoc?.spanLinksCount).to.eql({
            linkedParents: 0,
            linkedChildren: 1,
          });
        });
      });

      describe('consumer-multiple trace', () => {
        let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
        before(async () => {
          const tracesResponse = await fetchTraces({
            traceId: ids.producerMultiple.traceId,
            entryTransactionId: ids.producerMultiple.transactionDId,
          });
          traces = tracesResponse.body;
        });

        it('contains two outgoing links on Transaction D', () => {
          const transactionDDoc = traces.items.find(
            (item) => item.id === ids.producerMultiple.transactionDId
          );
          expect(transactionDDoc).to.not.be(undefined);
          expect(transactionDDoc?.spanLinksCount).to.eql({
            linkedParents: 2,
            linkedChildren: 0,
          });
        });

        it('contains two outgoing links on Span E', () => {
          const spanEDoc = traces.items.find((item) => item.id === ids.producerMultiple.spanEId);
          expect(spanEDoc).to.not.be(undefined);
          expect(spanEDoc?.spanLinksCount).to.eql({
            linkedParents: 2,
            linkedChildren: 0,
          });
        });
      });

      describe('Span links details', () => {
        async function fetchChildrenAndParentsDetails({
          kuery,
          traceId,
          spanId,
          processorEvent,
        }: {
          kuery: string;
          traceId: string;
          spanId: string;
          processorEvent: ProcessorEvent;
        }) {
          const [childrenLinksResponse, parentsLinksResponse] = await Promise.all([
            await apmApiClient.readUser({
              endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/children',
              params: {
                path: { traceId, spanId },
                query: {
                  kuery,
                  start: new Date(start).toISOString(),
                  end: new Date(end).toISOString(),
                },
              },
            }),
            apmApiClient.readUser({
              endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents',
              params: {
                path: { traceId, spanId },
                query: {
                  kuery,
                  start: new Date(start).toISOString(),
                  end: new Date(end).toISOString(),
                  processorEvent,
                },
              },
            }),
          ]);

          return {
            childrenLinks: childrenLinksResponse.body,
            parentsLinks: parentsLinksResponse.body,
          };
        }

        describe('producer-internal-only span links details', () => {
          let transactionALinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          let spanALinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          before(async () => {
            const [transactionALinksDetailsResponse, spanALinksDetailsResponse] = await Promise.all(
              [
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: ids.producerInternalOnly.traceId,
                  spanId: ids.producerInternalOnly.transactionAId,
                  processorEvent: ProcessorEvent.transaction,
                }),
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: ids.producerInternalOnly.traceId,
                  spanId: ids.producerInternalOnly.spanAId,
                  processorEvent: ProcessorEvent.span,
                }),
              ]
            );
            transactionALinksDetails = transactionALinksDetailsResponse;
            spanALinksDetails = spanALinksDetailsResponse;
          });

          it('returns no links for transaction A', () => {
            expect(transactionALinksDetails.childrenLinks.spanLinksDetails).to.eql([]);
            expect(transactionALinksDetails.parentsLinks.spanLinksDetails).to.eql([]);
          });

          it('returns no parents on Span A', () => {
            expect(spanALinksDetails.parentsLinks.spanLinksDetails).to.eql([]);
          });

          it('returns two children on Span A', () => {
            expect(spanALinksDetails.childrenLinks.spanLinksDetails.length).to.eql(2);
            const serviceCDetails = spanALinksDetails.childrenLinks.spanLinksDetails.find(
              (childDetails) => {
                return (
                  childDetails.traceId === ids.producerConsumer.traceId &&
                  childDetails.spanId === ids.producerConsumer.transactionCId
                );
              }
            );
            expect(serviceCDetails?.details).to.eql({
              serviceName: 'producer-consumer',
              agentName: 'ruby',
              transactionId: ids.producerConsumer.transactionCId,
              spanName: 'Transaction C',
              duration: 1000000,
            });

            const serviceDDetails = spanALinksDetails.childrenLinks.spanLinksDetails.find(
              (childDetails) => {
                return (
                  childDetails.traceId === ids.producerMultiple.traceId &&
                  childDetails.spanId === ids.producerMultiple.transactionDId
                );
              }
            );
            expect(serviceDDetails?.details).to.eql({
              serviceName: 'consumer-multiple',
              agentName: 'nodejs',
              transactionId: ids.producerMultiple.transactionDId,
              spanName: 'Transaction D',
              duration: 1000000,
            });
          });
        });

        describe('producer-external-only span links details', () => {
          let transactionBLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          let spanBLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          before(async () => {
            const [transactionALinksDetailsResponse, spanALinksDetailsResponse] = await Promise.all(
              [
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: ids.producerExternalOnly.traceId,
                  spanId: ids.producerExternalOnly.transactionBId,
                  processorEvent: ProcessorEvent.transaction,
                }),
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: ids.producerExternalOnly.traceId,
                  spanId: ids.producerExternalOnly.spanBId,
                  processorEvent: ProcessorEvent.span,
                }),
              ]
            );
            transactionBLinksDetails = transactionALinksDetailsResponse;
            spanBLinksDetails = spanALinksDetailsResponse;
          });

          it('returns producer-consumer as children of transaction B', () => {
            expect(transactionBLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
          });

          it('returns no parent for transaction B', () => {
            expect(transactionBLinksDetails.parentsLinks.spanLinksDetails).to.eql([]);
          });

          it('returns external parent on Span B', () => {
            expect(spanBLinksDetails.parentsLinks.spanLinksDetails.length).to.be(1);
            expect(spanBLinksDetails.parentsLinks.spanLinksDetails).to.eql([
              { traceId: 'trace#1', spanId: 'span#1' },
            ]);
          });

          it('returns consumer-multiple as child on Span B', () => {
            expect(spanBLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
            expect(spanBLinksDetails.childrenLinks.spanLinksDetails).to.eql([
              {
                traceId: ids.producerMultiple.traceId,
                spanId: ids.producerMultiple.spanEId,
                details: {
                  serviceName: 'consumer-multiple',
                  agentName: 'nodejs',
                  transactionId: ids.producerMultiple.transactionDId,
                  spanName: 'Span E',
                  duration: 100000,
                  spanSubtype: 'http',
                  spanType: 'external',
                },
              },
            ]);
          });
        });

        describe('producer-consumer span links details', () => {
          let transactionCLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          let spanCLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          before(async () => {
            const [transactionALinksDetailsResponse, spanALinksDetailsResponse] = await Promise.all(
              [
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: ids.producerConsumer.traceId,
                  spanId: ids.producerConsumer.transactionCId,
                  processorEvent: ProcessorEvent.transaction,
                }),
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: ids.producerConsumer.traceId,
                  spanId: ids.producerConsumer.spanCId,
                  processorEvent: ProcessorEvent.span,
                }),
              ]
            );
            transactionCLinksDetails = transactionALinksDetailsResponse;
            spanCLinksDetails = spanALinksDetailsResponse;
          });

          it('returns producer-internal-only Span A, producer-external-only Transaction B, and External link as parents of Transaction C', () => {
            expect(transactionCLinksDetails.parentsLinks.spanLinksDetails.length).to.be(3);
            expect(transactionCLinksDetails.parentsLinks.spanLinksDetails).to.eql([
              {
                traceId: ids.producerInternalOnly.traceId,
                spanId: ids.producerInternalOnly.spanAId,
                details: {
                  serviceName: 'producer-internal-only',
                  agentName: 'go',
                  transactionId: ids.producerInternalOnly.transactionAId,
                  spanName: 'Span A',
                  duration: 100000,
                  spanSubtype: 'http',
                  spanType: 'external',
                },
              },
              {
                traceId: ids.producerExternalOnly.traceId,
                spanId: ids.producerExternalOnly.transactionBId,
                details: {
                  serviceName: 'producer-external-only',
                  agentName: 'java',
                  transactionId: ids.producerExternalOnly.transactionBId,
                  duration: 1000000,
                  spanName: 'Transaction B',
                },
              },
              {
                traceId: ids.producerConsumer.externalTraceId,
                spanId: ids.producerExternalOnly.spanBId,
              },
            ]);
          });

          it('returns consumer-multiple Span E as child of Transaction C', () => {
            expect(transactionCLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
            expect(transactionCLinksDetails.childrenLinks.spanLinksDetails).to.eql([
              {
                traceId: ids.producerMultiple.traceId,
                spanId: ids.producerMultiple.spanEId,
                details: {
                  serviceName: 'consumer-multiple',
                  agentName: 'nodejs',
                  transactionId: ids.producerMultiple.transactionDId,
                  spanName: 'Span E',
                  duration: 100000,
                  spanSubtype: 'http',
                  spanType: 'external',
                },
              },
            ]);
          });

          it('returns no child on Span C', () => {
            expect(spanCLinksDetails.parentsLinks.spanLinksDetails.length).to.be(0);
          });

          it('returns consumer-multiple as Child on producer-consumer', () => {
            expect(spanCLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
            expect(spanCLinksDetails.childrenLinks.spanLinksDetails).to.eql([
              {
                traceId: ids.producerMultiple.traceId,
                spanId: ids.producerMultiple.transactionDId,
                details: {
                  serviceName: 'consumer-multiple',
                  agentName: 'nodejs',
                  transactionId: ids.producerMultiple.transactionDId,
                  spanName: 'Transaction D',
                  duration: 1000000,
                },
              },
            ]);
          });
        });

        describe('consumer-multiple span links details', () => {
          let transactionDLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          let spanELinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          before(async () => {
            const [transactionALinksDetailsResponse, spanALinksDetailsResponse] = await Promise.all(
              [
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: ids.producerMultiple.traceId,
                  spanId: ids.producerMultiple.transactionDId,
                  processorEvent: ProcessorEvent.transaction,
                }),
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: ids.producerMultiple.traceId,
                  spanId: ids.producerMultiple.spanEId,
                  processorEvent: ProcessorEvent.span,
                }),
              ]
            );
            transactionDLinksDetails = transactionALinksDetailsResponse;
            spanELinksDetails = spanALinksDetailsResponse;
          });

          it('returns producer-internal-only Span A and producer-consumer Span C as parents of Transaction D', () => {
            expect(transactionDLinksDetails.parentsLinks.spanLinksDetails.length).to.be(2);
            expect(transactionDLinksDetails.parentsLinks.spanLinksDetails).to.eql([
              {
                traceId: ids.producerInternalOnly.traceId,
                spanId: ids.producerInternalOnly.spanAId,
                details: {
                  serviceName: 'producer-internal-only',
                  agentName: 'go',
                  transactionId: ids.producerInternalOnly.transactionAId,
                  spanName: 'Span A',
                  duration: 100000,
                  spanSubtype: 'http',
                  spanType: 'external',
                },
              },
              {
                traceId: ids.producerConsumer.traceId,
                spanId: ids.producerConsumer.spanCId,
                details: {
                  serviceName: 'producer-consumer',
                  agentName: 'ruby',
                  transactionId: ids.producerConsumer.transactionCId,
                  spanName: 'Span C',
                  duration: 100000,
                  spanSubtype: 'http',
                  spanType: 'external',
                },
              },
            ]);
          });

          it('returns no children on Transaction D', () => {
            expect(transactionDLinksDetails.childrenLinks.spanLinksDetails.length).to.be(0);
          });

          it('returns producer-external-only Span B and producer-consumer Transaction C as parents of Span E', () => {
            expect(spanELinksDetails.parentsLinks.spanLinksDetails.length).to.be(2);

            expect(spanELinksDetails.parentsLinks.spanLinksDetails).to.eql([
              {
                traceId: ids.producerExternalOnly.traceId,
                spanId: ids.producerExternalOnly.spanBId,
                details: {
                  serviceName: 'producer-external-only',
                  agentName: 'java',
                  transactionId: ids.producerExternalOnly.transactionBId,
                  spanName: 'Span B',
                  duration: 100000,
                  spanSubtype: 'http',
                  spanType: 'external',
                },
              },
              {
                traceId: ids.producerConsumer.traceId,
                spanId: ids.producerConsumer.transactionCId,
                details: {
                  serviceName: 'producer-consumer',
                  agentName: 'ruby',
                  transactionId: ids.producerConsumer.transactionCId,
                  spanName: 'Transaction C',
                  duration: 1000000,
                },
              },
            ]);
          });

          it('returns no children on Span E', () => {
            expect(spanELinksDetails.childrenLinks.spanLinksDetails.length).to.be(0);
          });
        });
      });
    });
  });
}
