import {
  defaultFindTimeout,
} from '../index';

import PageObjects from './index';

export default class ConsolePage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }

  getServer() {
    return this.findTimeout
    .findByCssSelector('#kibana-body > div.content > div > div')
    .getVisibleText();
  }

  setServer(server) {
    return this.findTimeout
    .findByCssSelector('input[aria-label="Server Name"]')
    .clearValue()
    .type(server);
  }

  getRequest() {
    return this.findTimeout
    .findAllByCssSelector('div.ace_line_group')
    .then(function (editorData) {

      function getEditorData(line) {
        return line.getVisibleText();
      }

      const getEditorDataPromises = editorData.map(getEditorData);
      return Promise.all(getEditorDataPromises);
    });
  }

  getResponse() {
    return PageObjects.common.findTestSubject('response-editor')
    .getVisibleText();
  }

  clickPlay() {
    return PageObjects.common.findTestSubject('send-request-button')
    .click();
  }

  collapseHelp() {
    return PageObjects.common.findTestSubject('help-close-button')
    .click();

  }

}
