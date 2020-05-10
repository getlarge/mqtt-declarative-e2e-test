const TestGen = require('declarative-test-structure-generator');
const Client = require('./client');

class TestRunner {
  static run(config, testSuiteDefinition) {
    if (testSuiteDefinition === undefined) {
      console.log('Running with default config');
      config = {};
      testSuiteDefinition = arguments[1];
    }

    testSuiteDefinition = TestRunner.generateTestSuiteDefinition(testSuiteDefinition, config);

    TestGen.run(testSuiteDefinition);
  }

  static generateTestSuiteDefinition(def = {}, config = {}) {
    if (Array.isArray(def)) {
      return def.map(t => TestRunner.generateTestDefinition(t, config));
    }

    return Object.keys(def).reduce((res, key) => {
      const testSuiteDef = def[key];
      if (!testSuiteDef.tests) {
        throw new Error('Invalid test definition');
      }

      res[key] = {
        ...testSuiteDef,
        tests: TestRunner.generateTestSuiteDefinition(testSuiteDef.tests, config),
      };
      return res;
    }, {});
  }

  static generateTestDefinition(def, config) {
    return {
      ...def,
      test: TestRunner.buildTest(def, config),
    };
  }

  static buildTest(def, config) {
    return async () => {
      // console.log(`Test ${def.name}: started`);
      return Client.run(def, config);
      // .then(res => res)
      // .catch(e => {
      //   throw e.message;
      // });
    };
  }
}

module.exports = TestRunner