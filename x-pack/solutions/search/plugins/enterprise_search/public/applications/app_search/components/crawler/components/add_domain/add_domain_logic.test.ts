/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
  mockKibanaValues,
} from '../../../../../__mocks__/kea_logic';
import '../../../../__mocks__/engine_logic.mock';

jest.mock('../../crawler_logic', () => ({
  CrawlerLogic: {
    actions: {
      onReceiveCrawlerData: jest.fn(),
    },
  },
}));

jest.mock('./utils', () => ({
  ...(jest.requireActual('./utils') as object),
  getDomainWithProtocol: jest.fn().mockImplementation((domain) => domain),
}));

import { nextTick } from '@kbn/test-jest-helpers';

import { CrawlerLogic } from '../../crawler_logic';
import { CrawlerDomain } from '../../types';

import { AddDomainLogic, AddDomainLogicValues } from './add_domain_logic';
import { getDomainWithProtocol } from './utils';

const DEFAULT_VALUES: AddDomainLogicValues = {
  addDomainFormInputValue: 'https://',
  entryPointValue: '/',
  canIgnoreValidationFailure: false,
  displayValidation: false,
  domainValidationResult: {
    steps: {
      contentVerification: { state: '' },
      indexingRestrictions: { state: '' },
      initialValidation: { state: '' },
      networkConnectivity: { state: '' },
    },
  },
  allowSubmit: false,
  ignoreValidationFailure: false,
  isValidationLoading: false,
  hasBlockingFailure: false,
  hasValidationCompleted: false,
  errors: [],
};

describe('AddDomainLogic', () => {
  const { mount } = new LogicMounter(AddDomainLogic);
  const { flashSuccessToast } = mockFlashMessageHelpers;
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has default values', () => {
    expect(AddDomainLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('clearDomainFormInputValue', () => {
      beforeEach(() => {
        mount({
          addDomainFormInputValue: 'http://elastic.co',
          entryPointValue: '/foo',
          hasValidationCompleted: true,
          errors: ['first error', 'second error'],
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'loading' },
              indexingRestrictions: { state: 'loading' },
              initialValidation: { state: 'loading' },
              networkConnectivity: { state: 'loading' },
            },
          },
        });

        AddDomainLogic.actions.clearDomainFormInputValue();
      });

      it('should clear the input value', () => {
        expect(AddDomainLogic.values.addDomainFormInputValue).toEqual('https://');
      });

      it('should clear the entry point value', () => {
        expect(AddDomainLogic.values.entryPointValue).toEqual('/');
      });

      it('should reset validation completion', () => {
        expect(AddDomainLogic.values.hasValidationCompleted).toEqual(false);
      });

      it('should clear errors', () => {
        expect(AddDomainLogic.values.errors).toEqual([]);
      });

      it('should clear validation results', () => {
        expect(AddDomainLogic.values.domainValidationResult).toEqual({
          steps: {
            contentVerification: { state: '' },
            indexingRestrictions: { state: '' },
            initialValidation: { state: '' },
            networkConnectivity: { state: '' },
          },
        });
      });
    });

    describe('onSubmitNewDomainError', () => {
      it('should set errors', () => {
        mount();

        AddDomainLogic.actions.onSubmitNewDomainError(['first error', 'second error']);

        expect(AddDomainLogic.values.errors).toEqual(['first error', 'second error']);
      });
    });

    describe('setAddDomainFormInputValue', () => {
      beforeEach(() => {
        mount({
          addDomainFormInputValue: 'https://elastic.co',
          entryPointValue: '/customers',
          hasValidationCompleted: true,
          errors: ['first error', 'second error'],
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'loading' },
              indexingRestrictions: { state: 'loading' },
              initialValidation: { state: 'loading' },
              networkConnectivity: { state: 'loading' },
            },
          },
        });

        AddDomainLogic.actions.setAddDomainFormInputValue('https://swiftype.com/site-search');
      });

      it('should set the input value', () => {
        expect(AddDomainLogic.values.addDomainFormInputValue).toEqual(
          'https://swiftype.com/site-search'
        );
      });

      it('should clear the entry point value', () => {
        expect(AddDomainLogic.values.entryPointValue).toEqual('/');
      });

      it('should reset validation completion', () => {
        expect(AddDomainLogic.values.hasValidationCompleted).toEqual(false);
      });

      it('should clear errors', () => {
        expect(AddDomainLogic.values.errors).toEqual([]);
      });

      it('should clear validation results', () => {
        expect(AddDomainLogic.values.domainValidationResult).toEqual({
          steps: {
            contentVerification: { state: '' },
            indexingRestrictions: { state: '' },
            initialValidation: { state: '' },
            networkConnectivity: { state: '' },
          },
        });
      });
    });

    describe('setDomainValidationResult', () => {
      it('should update the validation result', () => {
        AddDomainLogic.actions.setDomainValidationResult({
          contentVerification: { state: 'invalid' },
        });

        expect(AddDomainLogic.values.domainValidationResult).toEqual({
          steps: {
            contentVerification: { state: 'invalid' },
            indexingRestrictions: { state: '' },
            initialValidation: { state: '' },
            networkConnectivity: { state: '' },
          },
        });
      });
    });

    describe('setIgnoreValidationFailure', () => {
      beforeEach(() => {
        mount({
          addDomainFormInputValue: 'https://elastic.co',
          entryPointValue: '/customers',
          hasValidationCompleted: true,
          errors: ['first error', 'second error'],
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'loading' },
              indexingRestrictions: { state: 'loading' },
              initialValidation: { state: 'loading' },
              networkConnectivity: { state: 'loading' },
            },
          },
        });

        AddDomainLogic.actions.setIgnoreValidationFailure(true);
      });

      it('should set the input value', () => {
        expect(AddDomainLogic.values.ignoreValidationFailure).toEqual(true);
      });
    });

    describe('submitNewDomain', () => {
      it('should clear errors', () => {
        mount({
          errors: ['first-error', 'second error'],
        });

        AddDomainLogic.actions.submitNewDomain();

        expect(AddDomainLogic.values.errors).toEqual([]);
      });
    });

    describe('validateDomainInitialVerification', () => {
      beforeEach(() => {
        mount({
          addDomainFormInputValue: 'https://elastic.co',
          entryPointValue: '/customers',
          hasValidationCompleted: true,
          errors: ['first error', 'second error'],
        });

        AddDomainLogic.actions.validateDomainInitialVerification(
          'https://swiftype.com',
          '/site-search'
        );
      });

      it('should set the input value', () => {
        expect(AddDomainLogic.values.addDomainFormInputValue).toEqual('https://swiftype.com');
      });

      it('should set the entry point value', () => {
        expect(AddDomainLogic.values.entryPointValue).toEqual('/site-search');
      });

      it('should clear errors', () => {
        expect(AddDomainLogic.values.errors).toEqual([]);
      });
    });

    describe('startDomainValidation', () => {
      it('should set validation results to loading', () => {
        mount({
          domainValidationResult: {
            steps: {
              contentVerification: { state: '' },
              indexingRestrictions: { state: '' },
              initialValidation: { state: '' },
              networkConnectivity: { state: '' },
            },
          },
        });

        AddDomainLogic.actions.startDomainValidation();

        expect(AddDomainLogic.values.domainValidationResult).toEqual({
          steps: {
            contentVerification: { state: 'loading' },
            indexingRestrictions: { state: 'loading' },
            initialValidation: { state: 'loading' },
            networkConnectivity: { state: 'loading' },
          },
        });
      });
    });
  });

  describe('listeners', () => {
    describe('onSubmitNewDomainSuccess', () => {
      it('should flash a success toast', () => {
        const { navigateToUrl } = mockKibanaValues;

        AddDomainLogic.actions.onSubmitNewDomainSuccess({ id: 'test-domain' } as CrawlerDomain);

        expect(flashSuccessToast).toHaveBeenCalled();
        expect(navigateToUrl).toHaveBeenCalledWith(
          '/engines/some-engine/crawler/domains/test-domain'
        );
      });
    });

    describe('submitNewDomain', () => {
      it('calls the domains endpoint with a JSON formatted body', async () => {
        mount({
          addDomainFormInputValue: 'https://elastic.co',
          entryPointValue: '/guide',
        });
        http.post.mockReturnValueOnce(Promise.resolve({}));

        AddDomainLogic.actions.submitNewDomain();
        await nextTick();

        expect(http.post).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/crawler/domains',
          {
            query: {
              respond_with: 'crawler_details',
            },
            body: JSON.stringify({
              name: 'https://elastic.co',
              entry_points: [{ value: '/guide' }],
            }),
          }
        );
      });

      describe('on success', () => {
        it('sets crawler data', async () => {
          http.post.mockReturnValueOnce(
            Promise.resolve({
              domains: [],
              events: [],
              most_recent_crawl_request: null,
            })
          );

          AddDomainLogic.actions.submitNewDomain();
          await nextTick();

          expect(CrawlerLogic.actions.onReceiveCrawlerData).toHaveBeenCalledWith({
            domains: [],
            events: [],
            mostRecentCrawlRequest: null,
          });
        });

        it('calls the success callback with the most recent domain', async () => {
          http.post.mockReturnValueOnce(
            Promise.resolve({
              domains: [
                {
                  id: '1',
                  name: 'https://elastic.co/guide',
                },
                {
                  id: '2',
                  name: 'https://swiftype.co/site-search',
                },
              ],
              events: [],
              most_recent_crawl_request: null,
            })
          );
          jest.spyOn(AddDomainLogic.actions, 'onSubmitNewDomainSuccess');
          AddDomainLogic.actions.submitNewDomain();
          await nextTick();

          expect(AddDomainLogic.actions.onSubmitNewDomainSuccess).toHaveBeenCalledWith({
            id: '2',
            url: 'https://swiftype.co/site-search',
          });
        });
      });

      describe('on error', () => {
        it('passes error messages to the error callback', async () => {
          jest.spyOn(AddDomainLogic.actions, 'onSubmitNewDomainError');

          http.post.mockReturnValueOnce(
            Promise.reject({
              body: {
                attributes: {
                  errors: ['first error', 'second error'],
                },
              },
            })
          );

          AddDomainLogic.actions.submitNewDomain();
          await nextTick();

          expect(AddDomainLogic.actions.onSubmitNewDomainError).toHaveBeenCalledWith([
            'first error',
            'second error',
          ]);
        });
      });
    });

    describe('startDomainValidation', () => {
      it('extracts the domain and entrypoint and passes them to the callback ', async () => {
        mount({ addDomainFormInputValue: 'https://swiftype.com/site-search' });
        jest.spyOn(AddDomainLogic.actions, 'validateDomainInitialVerification');

        AddDomainLogic.actions.startDomainValidation();
        await nextTick();

        expect(AddDomainLogic.actions.validateDomainInitialVerification).toHaveBeenCalledWith(
          'https://swiftype.com',
          '/site-search'
        );
        expect(getDomainWithProtocol).toHaveBeenCalledWith('https://swiftype.com');
      });
    });

    describe('validateDomainInitialVerification', () => {
      it('validates the url', async () => {
        jest.spyOn(AddDomainLogic.actions, 'performDomainValidationStep');

        AddDomainLogic.actions.validateDomainInitialVerification('https://elastic.co', '/');
        await nextTick();

        expect(AddDomainLogic.actions.performDomainValidationStep).toHaveBeenCalledWith(
          'initialValidation',
          ['url']
        );
      });
    });

    describe('validateDomainContentVerification', () => {
      it('validates the domain content', async () => {
        jest.spyOn(AddDomainLogic.actions, 'performDomainValidationStep');

        AddDomainLogic.actions.validateDomainContentVerification();
        await nextTick();

        expect(AddDomainLogic.actions.performDomainValidationStep).toHaveBeenCalledWith(
          'contentVerification',
          ['url_request', 'url_content']
        );
      });
    });

    describe('validateDomainIndexingRestrictions', () => {
      it("validates the domain's robots.txt", async () => {
        jest.spyOn(AddDomainLogic.actions, 'performDomainValidationStep');

        AddDomainLogic.actions.validateDomainIndexingRestrictions();
        await nextTick();

        expect(AddDomainLogic.actions.performDomainValidationStep).toHaveBeenCalledWith(
          'indexingRestrictions',
          ['robots_txt']
        );
      });
    });

    describe('validateDomainNetworkConnectivity', () => {
      it("validates the domain's dns", async () => {
        jest.spyOn(AddDomainLogic.actions, 'performDomainValidationStep');

        AddDomainLogic.actions.validateDomainNetworkConnectivity();
        await nextTick();

        expect(AddDomainLogic.actions.performDomainValidationStep).toHaveBeenCalledWith(
          'networkConnectivity',
          ['dns', 'tcp']
        );
      });
    });

    describe('performDomainValidationStep', () => {
      beforeEach(() => {
        mount({
          addDomainFormInputValue: 'https://elastic.co',
        });
      });

      describe('on success', () => {
        it('sets all remaining validation steps invalid on a blocking failure', async () => {
          http.post.mockReturnValueOnce(
            Promise.resolve({
              valid: false,
              results: [
                {
                  name: '-',
                  result: 'failure',
                  comment: 'Something unexpected happened',
                },
              ],
            })
          );

          jest.spyOn(AddDomainLogic.actions, 'setDomainValidationResult');

          AddDomainLogic.actions.performDomainValidationStep('initialValidation', ['url']);
          await nextTick();

          expect(AddDomainLogic.actions.setDomainValidationResult).toHaveBeenCalledWith({
            initialValidation: {
              state: 'invalid',
              blockingFailure: true,
              message: 'Something unexpected happened',
            },
            networkConnectivity: {
              state: 'invalid',
              message:
                'Unable to establish a network connection because the "Initial validation" check failed.',
            },
            indexingRestrictions: {
              state: 'invalid',
              message:
                'Unable to determine indexing restrictions because the "Network connectivity" check failed.',
            },
            contentVerification: {
              state: 'invalid',
              message: 'Unable to verify content because the "Indexing restrictions" check failed.',
            },
          });
        });

        describe('when there are no blocking failures', () => {
          beforeEach(() => {
            http.post.mockReturnValue(
              Promise.resolve({
                valid: true,
                results: [],
              })
            );
          });

          it('updates the validation result', async () => {
            jest.spyOn(AddDomainLogic.actions, 'setDomainValidationResult');

            AddDomainLogic.actions.performDomainValidationStep('initialValidation', ['url']);
            await nextTick();

            expect(AddDomainLogic.actions.setDomainValidationResult).toHaveBeenCalledWith({
              initialValidation: {
                state: 'valid',
              },
            });
          });

          describe('validation chain', () => {
            beforeEach(() => {
              http.post.mockReturnValue(
                Promise.resolve({
                  valid: true,
                  results: [],
                })
              );
            });

            it('checks network connectivity after initial validation', async () => {
              jest.spyOn(AddDomainLogic.actions, 'validateDomainNetworkConnectivity');

              AddDomainLogic.actions.performDomainValidationStep('initialValidation', ['url']);
              await nextTick();

              expect(AddDomainLogic.actions.validateDomainNetworkConnectivity).toHaveBeenCalled();
            });

            it('checks indexing restrictions after network connectivity', async () => {
              jest.spyOn(AddDomainLogic.actions, 'validateDomainIndexingRestrictions');

              AddDomainLogic.actions.performDomainValidationStep('networkConnectivity', ['url']);
              await nextTick();

              expect(AddDomainLogic.actions.validateDomainIndexingRestrictions).toHaveBeenCalled();
            });

            it('checks content after indexing restrictions', async () => {
              jest.spyOn(AddDomainLogic.actions, 'validateDomainContentVerification');

              AddDomainLogic.actions.performDomainValidationStep('indexingRestrictions', ['url']);
              await nextTick();

              expect(AddDomainLogic.actions.validateDomainContentVerification).toHaveBeenCalled();
            });
          });
        });
      });

      describe('on failure', () => {
        it('it sets all remaining validation steps as invalid', async () => {
          http.post.mockReturnValueOnce(Promise.reject({}));

          jest.spyOn(AddDomainLogic.actions, 'setDomainValidationResult');

          AddDomainLogic.actions.performDomainValidationStep('initialValidation', ['url']);
          await nextTick();

          expect(AddDomainLogic.actions.setDomainValidationResult).toHaveBeenCalledWith({
            initialValidation: {
              state: 'invalid',
              blockingFailure: true,
              message: 'Unexpected error',
            },
            networkConnectivity: {
              state: 'invalid',
              message:
                'Unable to establish a network connection because the "Initial validation" check failed.',
            },
            indexingRestrictions: {
              state: 'invalid',
              message:
                'Unable to determine indexing restrictions because the "Network connectivity" check failed.',
            },
            contentVerification: {
              state: 'invalid',
              message: 'Unable to verify content because the "Indexing restrictions" check failed.',
            },
          });
        });
      });
    });
  });

  describe('selectors', () => {
    describe('isValidationLoading', () => {
      it('is false by default', () => {
        expect(AddDomainLogic.values.isValidationLoading).toEqual(false);
      });

      it('is true when any steps are loading', () => {
        mount({
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'valid' },
              indexingRestrictions: { state: 'valid' },
              initialValidation: { state: 'valid' },
              networkConnectivity: { state: 'loading' },
            },
          },
        });

        expect(AddDomainLogic.values.isValidationLoading).toEqual(true);
      });
    });

    describe('hasValidationCompleted', () => {
      it('is false when steps are loading', () => {
        mount({
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'loading' },
              indexingRestrictions: { state: 'loading' },
              initialValidation: { state: 'loading' },
              networkConnectivity: { state: 'loading' },
            },
          },
        });

        expect(AddDomainLogic.values.hasValidationCompleted).toEqual(false);
      });

      it('is true when all steps no steps are valid or invalid', () => {
        mount({
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'valid' },
              indexingRestrictions: { state: 'valid' },
              initialValidation: { state: 'invalid' },
              networkConnectivity: { state: 'invalid' },
            },
          },
        });

        expect(AddDomainLogic.values.hasValidationCompleted).toEqual(true);
      });
    });

    describe('hasBlockingFailure', () => {
      it('is true when any steps have blocking failures', () => {
        mount({
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'valid' },
              indexingRestrictions: { state: 'valid' },
              initialValidation: { state: 'valid' },
              networkConnectivity: { state: 'invalid', blockingFailure: true },
            },
          },
        });

        expect(AddDomainLogic.values.hasBlockingFailure).toEqual(true);
      });
    });

    describe('canIgnoreValidationFailure', () => {
      it('is true when any steps have blocking failures', () => {
        mount({
          hasValidationCompleted: true,
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'invalid', blockingFailure: true },
              indexingRestrictions: { state: 'valid' },
              initialValidation: { state: 'valid' },
              networkConnectivity: { state: 'valid' },
            },
          },
        });

        expect(AddDomainLogic.values.canIgnoreValidationFailure).toEqual(true);
      });

      it('is false when validation has not completed', () => {
        mount({
          hasValidationCompleted: false,
        });

        expect(AddDomainLogic.values.canIgnoreValidationFailure).toEqual(false);
      });
    });

    describe('allowSubmit', () => {
      it('is true when a user has validated all steps and has no failures', () => {
        mount({
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'valid' },
              indexingRestrictions: { state: 'valid' },
              initialValidation: { state: 'valid' },
              networkConnectivity: { state: 'valid' },
            },
          },
        });

        expect(AddDomainLogic.values.allowSubmit).toEqual(true);
      });

      it('is true when a user ignores validation failure', () => {
        mount({
          ignoreValidationFailure: true,
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'valid' },
              indexingRestrictions: { state: 'valid' },
              initialValidation: { state: 'invalid' },
              networkConnectivity: { state: 'invalid' },
            },
          },
        });

        expect(AddDomainLogic.values.allowSubmit).toEqual(true);
      });
    });

    describe('displayValidation', () => {
      it('is true when a user is loading validation', () => {
        mount({
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'loading' },
              indexingRestrictions: { state: 'loading' },
              initialValidation: { state: 'loading' },
              networkConnectivity: { state: 'loading' },
            },
          },
        });

        expect(AddDomainLogic.values.displayValidation).toEqual(true);
      });

      it('is true when a user has completed validation', () => {
        mount({
          domainValidationResult: {
            steps: {
              contentVerification: { state: 'valid' },
              indexingRestrictions: { state: 'valid' },
              initialValidation: { state: 'valid' },
              networkConnectivity: { state: 'invalid' },
            },
          },
        });

        expect(AddDomainLogic.values.displayValidation).toEqual(true);
      });
    });
  });
});
