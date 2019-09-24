
import {
  defaultFindTimeout,
} from '../index';

import PageObjects from './index';

export default class GraphPage {

  init(remote) {
    this.remote = remote;
    this.findTimeout = this.remote.setFindTimeout(defaultFindTimeout);
  }


  selectIndexPattern(pattern) {
    return this.findTimeout
    .findDisplayedByCssSelector('.indexDropDown')
    .click()
    .then(() => {
      return this.findTimeout
      .findByCssSelector('.indexDropDown > option[label="' + pattern + '"]')
      .click();
    })
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  clickAddField() {
    return this.findTimeout
    .findById('addVertexFieldButton')
    .click();
  }

  selectField(field) {
    return this.findTimeout
    .findDisplayedByCssSelector('select[id="fieldList"] > option[label="' + field + '"]')
    .click()
    .then(() => {
      return this.findTimeout
      .findDisplayedByCssSelector('button[ng-click="addFieldToSelection()"]')
      .click();
    })
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }

  addField(field) {
    return this.clickAddField()
    .then(() => {
      return this.selectField(field);
    });
  }

  query(str) {
    return this.findTimeout
    .findByCssSelector('input.kuiLocalSearchInput')
    .type(str)
    .then(() => {
      return this.findTimeout
      .findByCssSelector('button.kuiLocalSearchButton')
      .click();
    })
    .then(() => {
      return PageObjects.header.getSpinnerDone();
    });
  }


  getGraphCircleText() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('text.nodeSvgText')
    .then(function (chartTypes) {

      function getCircleText(circle) {
        return circle
        .getVisibleText();
      }

      const getChartTypesPromises = chartTypes.map(getCircleText);
      return Promise.all(getChartTypesPromises);
    })
    .then(function (circleText) {
      return circleText;
    });
  }

  getGraphConnectingLines() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('line.edge')
    .then(function (chartTypes) {

      function getLineStyle(line) {
        return line
        .getAttribute('style');
      }

      const getChartTypesPromises = chartTypes.map(getLineStyle);
      return Promise.all(getChartTypesPromises);
    })
    .then(function (lineStyle) {
      return lineStyle;
    });
  }

  // click the line which matches the style
  clickGraphConnectingLine(style) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('line.edge[style="' + style + '"]')
    .click();
  }

  newGraph() {
    PageObjects.common.debug('Click New Workspace');
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('[aria-label="New Workspace"]')
    .click()
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(() => {
      return this.remote.acceptAlert();
    })
    .catch (() => {});
  }


  saveGraph(name) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('[aria-label="Save Workspace"]')
    .click()
    .then(() => {
      return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findById('workspaceTitle')
      .type(name);
    })
    .then(() => {
      return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('button[aria-label="Save workspace"]')
      .click();
    })
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(() => {
      return PageObjects.common.try(() => {
        return this.remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector('kbn-truncated.toast-message')
        .getVisibleText();
      });
    });
  }

  openGraph(name) {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('[aria-label="Load Saved Workspace"]')
    .click()
    .then(() => {
      return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByCssSelector('input[name="filter"]')
      .type(name);
    })
    .then(() => {
      return this.remote
      .setFindTimeout(defaultFindTimeout)
      .findByLinkText(name)
      .click();
    });
  }

  deleteGraph(name) {
    let alertText;
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('[aria-label="Delete Saved Workspace"]')
    .click()
    .then(() => {
      return PageObjects.common.sleep(1000);
    })
    .then(() => {
      return this.remote.getAlertText();
    })
    .then((text) => {
      alertText = text;
      return this.remote.acceptAlert();
    })
    .then(function (text) {
      return alertText;
    });
  }


  getVennTerm1() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('span.vennTerm1')
    .getVisibleText();
  }

  getVennTerm2() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('span.vennTerm2')
    .getVisibleText();
  }

  getSmallVennTerm1() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('small.vennTerm1')
    .getVisibleText();
  }

  getSmallVennTerm12() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('small.vennTerm12')
    .getVisibleText();
  }

  getSmallVennTerm2() {
    return this.remote
    .setFindTimeout(defaultFindTimeout)
    .findByCssSelector('small.vennTerm2')
    .getVisibleText();
  }

}
