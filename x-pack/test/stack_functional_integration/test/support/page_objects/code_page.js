import {
  defaultFindTimeout
} from '../index';

import PageObjects from './index';

export default class CodePage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }

  fillImportRepositoryUrlInputBox(repoUrl) {
    return PageObjects.common.findTestSubject('importRepositoryUrlInputBox').clearValue().type(repoUrl);
  }

  clickImportRepositoryButton() {
    return PageObjects.common.findTestSubject('importRepositoryButton').click();
  }

  clickDeleteRepositoryButton() {
    return PageObjects.common.findTestSubject('deleteRepositoryButton').click();
  }
}
