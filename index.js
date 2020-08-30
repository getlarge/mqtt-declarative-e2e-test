const { api } = require('declarative-test-structure-generator');
const TestRunner = require('./src/test-runner');

module.exports = {
  run: (config, testSuiteDefinition, frameworkApi) =>
    TestRunner.run(config, testSuiteDefinition, frameworkApi),
  api,
};
