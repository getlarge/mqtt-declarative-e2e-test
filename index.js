const TestRunner = require("./src/test-runner");

module.exports = (config, testSuiteDefinition) => {
  TestRunner.run(config, testSuiteDefinition);
};
