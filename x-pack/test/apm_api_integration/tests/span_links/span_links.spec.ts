/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EntityArrayIterable } from '@elastic/apm-synthtrace';
import { ProcessorEvent } from '@kbn/apm-plugin/common/processor_event';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateSpanLinksData } from './data_generator';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2022-01-01T00:00:00.000Z').getTime();
  const end = new Date('2022-01-01T00:15:00.000Z').getTime() - 1;

  registry.when(
    'contains linked children',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      let serviceAIds: {
        transactionAId: string;
        traceId: string;
        spanAId: string;
      };

      let serviceBIds: {
        traceId: string;
        transactionBId: string;
        spanBId: string;
      };

      let serviceCIds: {
        traceId: string;
        transactionCId: string;
        spanCId: string;
      };

      let serviceDIds: {
        traceId: string;
        transactionDId: string;
        spanEId: string;
      };

      before(async () => {
        const { events, ids } = generateSpanLinksData();

        serviceAIds = ids.serviceAIds;
        serviceBIds = ids.serviceBIds;
        serviceCIds = ids.serviceCIds;
        serviceDIds = ids.serviceDIds;

        await synthtraceEsClient.index(
          new EntityArrayIterable(events.serviceAAsArray).merge(
            new EntityArrayIterable(events.serviceBAsArray),
            new EntityArrayIterable(events.serviceCAsArray),
            new EntityArrayIterable(events.serviceDAsArray)
          )
        );
      });

      // after(() => synthtraceEsClient.clean());

      describe('Span links count on traces', () => {
        async function fetchTraces({ traceId }: { traceId: string }) {
          return await apmApiClient.readUser({
            endpoint: `GET /internal/apm/traces/{traceId}`,
            params: {
              path: { traceId },
              query: {
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
              },
            },
          });
        }

        describe('Service A trace', () => {
          let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
          before(async () => {
            const tracesResponse = await fetchTraces({ traceId: serviceAIds.traceId });
            traces = tracesResponse.body;
          });

          it('contains two children link on Span A', () => {
            expect(Object.values(traces.linkedChildrenOfSpanCountBySpanId).length).to.equal(1);
            expect(traces.linkedChildrenOfSpanCountBySpanId[serviceAIds.spanAId]).to.equal(2);
          });
        });

        describe('Service B trace', () => {
          let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
          before(async () => {
            const tracesResponse = await fetchTraces({ traceId: serviceBIds.traceId });
            traces = tracesResponse.body;
          });

          it('contains one children link on Span B', () => {
            expect(Object.values(traces.linkedChildrenOfSpanCountBySpanId).length).to.equal(1);
            expect(traces.linkedChildrenOfSpanCountBySpanId[serviceBIds.spanBId]).to.equal(1);
          });
        });

        describe('Service C trace', () => {
          let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
          before(async () => {
            const tracesResponse = await fetchTraces({ traceId: serviceCIds.traceId });
            traces = tracesResponse.body;
          });

          it('contains one children link on transaction C and two on span C', () => {
            expect(Object.values(traces.linkedChildrenOfSpanCountBySpanId).length).to.equal(2);
            expect(traces.linkedChildrenOfSpanCountBySpanId[serviceCIds.transactionCId]).to.equal(
              1
            );
            expect(traces.linkedChildrenOfSpanCountBySpanId[serviceCIds.spanCId]).to.equal(1);
          });
        });

        describe('Service D trace', () => {
          let traces: Awaited<ReturnType<typeof fetchTraces>>['body'];
          before(async () => {
            const tracesResponse = await fetchTraces({ traceId: serviceDIds.traceId });
            traces = tracesResponse.body;
          });

          it('contains no children', () => {
            expect(Object.values(traces.linkedChildrenOfSpanCountBySpanId).length).to.equal(0);
            expect(traces.linkedChildrenOfSpanCountBySpanId[serviceDIds.transactionDId]).to.equal(
              undefined
            );
            expect(traces.linkedChildrenOfSpanCountBySpanId[serviceDIds.spanEId]).to.equal(
              undefined
            );
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

        describe('Service A span links details', () => {
          let transactionALinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          let spanALinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          before(async () => {
            const [transactionALinksDetailsResponse, spanALinksDetailsResponse] = await Promise.all(
              [
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: serviceAIds.traceId,
                  spanId: serviceAIds.transactionAId,
                  processorEvent: ProcessorEvent.transaction,
                }),
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: serviceAIds.traceId,
                  spanId: serviceAIds.spanAId,
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
                  childDetails.traceId === serviceCIds.traceId &&
                  childDetails.spanId === serviceCIds.transactionCId
                );
              }
            );
            expect(serviceCDetails?.details).to.eql({
              serviceName: 'Service C',
              agentName: 'ruby',
              transactionId: serviceCIds.transactionCId,
              spanName: 'Transaction C',
              duration: 1000000,
            });

            const serviceDDetails = spanALinksDetails.childrenLinks.spanLinksDetails.find(
              (childDetails) => {
                return (
                  childDetails.traceId === serviceDIds.traceId &&
                  childDetails.spanId === serviceDIds.transactionDId
                );
              }
            );
            expect(serviceDDetails?.details).to.eql({
              serviceName: 'Service D',
              agentName: 'nodejs',
              transactionId: serviceDIds.transactionDId,
              spanName: 'Transaction D',
              duration: 1000000,
            });
          });
        });

        describe('Service B span links details', () => {
          let transactionBLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          let spanBLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          before(async () => {
            const [transactionALinksDetailsResponse, spanALinksDetailsResponse] = await Promise.all(
              [
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: serviceBIds.traceId,
                  spanId: serviceBIds.transactionBId,
                  processorEvent: ProcessorEvent.transaction,
                }),
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: serviceBIds.traceId,
                  spanId: serviceBIds.spanBId,
                  processorEvent: ProcessorEvent.span,
                }),
              ]
            );
            transactionBLinksDetails = transactionALinksDetailsResponse;
            spanBLinksDetails = spanALinksDetailsResponse;
          });

          it('returns no links for transaction B', () => {
            expect(transactionBLinksDetails.childrenLinks.spanLinksDetails).to.eql([]);
            expect(transactionBLinksDetails.parentsLinks.spanLinksDetails).to.eql([]);
          });

          it('returns external parent on Span B', () => {
            expect(spanBLinksDetails.parentsLinks.spanLinksDetails.length).to.be(1);
            expect(spanBLinksDetails.parentsLinks.spanLinksDetails).to.eql([
              { traceId: '1', spanId: '2' },
            ]);
          });

          it('returns Service D as child on Span B', () => {
            expect(spanBLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
            expect(spanBLinksDetails.childrenLinks.spanLinksDetails).to.eql([
              {
                traceId: serviceDIds.traceId,
                spanId: serviceDIds.spanEId,
                details: {
                  serviceName: 'Service D',
                  agentName: 'nodejs',
                  transactionId: serviceDIds.transactionDId,
                  spanName: 'Span E',
                  duration: 100000,
                  spanSubtype: 'http',
                  spanType: 'external',
                },
              },
            ]);
          });
        });

        describe('Service C span links details', () => {
          let transactionCLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          let spanCLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          before(async () => {
            const [transactionALinksDetailsResponse, spanALinksDetailsResponse] = await Promise.all(
              [
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: serviceCIds.traceId,
                  spanId: serviceCIds.transactionCId,
                  processorEvent: ProcessorEvent.transaction,
                }),
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: serviceCIds.traceId,
                  spanId: serviceCIds.spanCId,
                  processorEvent: ProcessorEvent.span,
                }),
              ]
            );
            transactionCLinksDetails = transactionALinksDetailsResponse;
            spanCLinksDetails = spanALinksDetailsResponse;
          });

          it('returns Service A Span A as parent of Transaction C', () => {
            expect(transactionCLinksDetails.parentsLinks.spanLinksDetails.length).to.be(1);
            expect(transactionCLinksDetails.parentsLinks.spanLinksDetails).to.eql([
              {
                traceId: serviceAIds.traceId,
                spanId: serviceAIds.spanAId,
                details: {
                  serviceName: 'Service A',
                  agentName: 'go',
                  transactionId: serviceAIds.transactionAId,
                  spanName: 'Span A',
                  duration: 100000,
                  spanSubtype: 'http',
                  spanType: 'external',
                },
              },
            ]);
          });

          it('returns Service D Span E as child of Transaction C', () => {
            expect(transactionCLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
            expect(transactionCLinksDetails.childrenLinks.spanLinksDetails).to.eql([
              {
                traceId: serviceDIds.traceId,
                spanId: serviceDIds.spanEId,
                details: {
                  serviceName: 'Service D',
                  agentName: 'nodejs',
                  transactionId: serviceDIds.transactionDId,
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

          it('returns Service D as Child on Service C', () => {
            expect(spanCLinksDetails.childrenLinks.spanLinksDetails.length).to.be(1);
            expect(spanCLinksDetails.childrenLinks.spanLinksDetails).to.eql([
              {
                traceId: serviceDIds.traceId,
                spanId: serviceDIds.transactionDId,
                details: {
                  serviceName: 'Service D',
                  agentName: 'nodejs',
                  transactionId: serviceDIds.transactionDId,
                  spanName: 'Transaction D',
                  duration: 1000000,
                },
              },
            ]);
          });
        });

        describe('Service D span links details', () => {
          let transactionDLinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          let spanELinksDetails: Awaited<ReturnType<typeof fetchChildrenAndParentsDetails>>;
          before(async () => {
            const [transactionALinksDetailsResponse, spanALinksDetailsResponse] = await Promise.all(
              [
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: serviceDIds.traceId,
                  spanId: serviceDIds.transactionDId,
                  processorEvent: ProcessorEvent.transaction,
                }),
                fetchChildrenAndParentsDetails({
                  kuery: '',
                  traceId: serviceDIds.traceId,
                  spanId: serviceDIds.spanEId,
                  processorEvent: ProcessorEvent.span,
                }),
              ]
            );
            transactionDLinksDetails = transactionALinksDetailsResponse;
            spanELinksDetails = spanALinksDetailsResponse;
          });

          it('returns Service A Span A and Service C Span C as parents of Transaction D', () => {
            expect(transactionDLinksDetails.parentsLinks.spanLinksDetails.length).to.be(2);
            expect(transactionDLinksDetails.parentsLinks.spanLinksDetails).to.eql([
              {
                traceId: serviceAIds.traceId,
                spanId: serviceAIds.spanAId,
                details: {
                  serviceName: 'Service A',
                  agentName: 'go',
                  transactionId: serviceAIds.transactionAId,
                  spanName: 'Span A',
                  duration: 100000,
                  spanSubtype: 'http',
                  spanType: 'external',
                },
              },
              {
                traceId: serviceCIds.traceId,
                spanId: serviceCIds.spanCId,
                details: {
                  serviceName: 'Service C',
                  agentName: 'ruby',
                  transactionId: serviceCIds.transactionCId,
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

          it('returns Service B Span B and Service C Transaction C as parents of Span E', () => {
            expect(spanELinksDetails.parentsLinks.spanLinksDetails.length).to.be(2);

            expect(spanELinksDetails.parentsLinks.spanLinksDetails).to.eql([
              {
                traceId: serviceBIds.traceId,
                spanId: serviceBIds.spanBId,
                details: {
                  serviceName: 'Service B',
                  agentName: 'java',
                  transactionId: serviceBIds.transactionBId,
                  spanName: 'Span B',
                  duration: 100000,
                  spanSubtype: 'http',
                  spanType: 'external',
                },
              },
              {
                traceId: serviceCIds.traceId,
                spanId: serviceCIds.transactionCId,
                details: {
                  serviceName: 'Service C',
                  agentName: 'ruby',
                  transactionId: serviceCIds.transactionCId,
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
    }
  );
}
