
import { attempt } from 'bluebird';

import PageObjects from '../page_objects';

export default class BddWrapper {
  constructor(bdd) {
    this.bdd = bdd;
  }

  errorWrapper = fn => {
    // we want to assume the context set
    // by the test runner, so don't use an arrow
    return function () {
      const suiteOrTest = this;
      const errorHandler = PageObjects.common.createErrorHandler(suiteOrTest);
      return attempt(fn.bind(suiteOrTest)).catch(errorHandler);
    };
  }

  describe = (name, fn) => {
    this.bdd.describe(name, fn);
  }

  before = (fn) => {
    this.bdd.before(this.errorWrapper(fn));
  }

  beforeEach = (fn) => {
    this.bdd.beforeEach(this.errorWrapper(fn));
  }

  it = (name, fn) => {
    this.bdd.it(name, this.errorWrapper(fn));
  }

  afterEach = (fn) => {
    this.bdd.afterEach(this.errorWrapper(fn));
  }

  after = (fn) => {
    this.bdd.after(this.errorWrapper(fn));
  }
}
