/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'discover', 'header']);
  const log = getService('log');
  const screenshot = getService('screenshots');
  const retry = getService('retry');

  describe('shared links', function describeIndexTests() {
    let baseUrl;
    // The message changes for Firefox < 41 and Firefox >= 41
    // const expectedToastMessage = 'Share search: URL selected. Press Ctrl+C to copy.';
    // const expectedToastMessage = 'Share search: URL copied to clipboard.';
    // Pass either one.
    const expectedToastMessage = /Share search: URL (selected\. Press Ctrl\+C to copy\.|copied to clipboard\.)/;

    before(function() {
      baseUrl = PageObjects.common.getHostPort();

      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('discover');
      return PageObjects.common
        .navigateToApp('discover')
        .then(function() {
          log.debug('setAbsoluteRange');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function() {
          //After hiding the time picker, we need to wait for
          //the refresh button to hide before clicking the share button
          return PageObjects.common.sleep(1000);
        });
    });

    describe('shared link', function() {
      it('should show "Share a link" caption', function() {
        const expectedCaption = 'Share a link';
        return PageObjects.discover
          .clickShare()
          .then(function() {
            return screenshot.take('Discover-share-link').then(() => {
              return PageObjects.discover.getShareCaption();
            });
          })
          .then(function(actualCaption) {
            expect(actualCaption).to.be(expectedCaption);
          });
      });

      it('should show the correct formatted URL', function() {
        const expectedUrl =
          baseUrl +
          '/app/kibana?_t=1453775307251#' +
          '/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time' +
          ":(from:'2015-09-19T06:31:44.000Z',mode:absolute,to:'2015-09" +
          "-23T18:31:44.000Z'))&_a=(columns:!(_source),index:'logstash-" +
          "*',interval:auto,query:(query_string:(analyze_wildcard:!t,query" +
          ":'*')),sort:!('@timestamp',desc))";
        return PageObjects.discover.getSharedUrl().then(function(actualUrl) {
          // strip the timestamp out of each URL
          expect(actualUrl.replace(/_t=\d{13}/, '_t=TIMESTAMP')).to.be(
            expectedUrl.replace(/_t=\d{13}/, '_t=TIMESTAMP')
          );
        });
      });

      it('should show toast message for copy to clipboard', function() {
        return PageObjects.discover
          .clickCopyToClipboard()
          .then(function() {
            return PageObjects.header.getToastMessage();
          })
          .then(function(toastMessage) {
            return screenshot.take('Discover-copy-to-clipboard-toast').then(() => {
              expect(toastMessage).to.match(expectedToastMessage);
            });
          })
          .then(function() {
            return PageObjects.header.waitForToastMessageGone();
          });
      });

      // TODO: verify clipboard contents
      it('shorten URL button should produce a short URL', function() {
        const re = new RegExp(baseUrl + '/goto/[0-9a-f]{32}$');
        return PageObjects.discover.clickShortenUrl().then(function() {
          return retry.try(function tryingForTime() {
            return screenshot.take('Discover-shorten-url-button').then(() => {
              return PageObjects.discover.getShortenedUrl().then(function(actualUrl) {
                expect(actualUrl).to.match(re);
              });
            });
          });
        });
      });

      // NOTE: This test has to run immediately after the test above
      it('should show toast message for copy to clipboard', function() {
        return PageObjects.discover
          .clickCopyToClipboard()
          .then(function() {
            return PageObjects.header.getToastMessage();
          })
          .then(function(toastMessage) {
            expect(toastMessage).to.match(expectedToastMessage);
          })
          .then(function() {
            return PageObjects.header.waitForToastMessageGone();
          });
      });
    });
  });
}
