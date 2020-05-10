# mqtt-declarative-e2e-test

`mqtt-declarative-e2e-test` allows to write tests for MQTT clients in an object definition style.

```js
const e2eTestsSuite = {
  [`[TEST] Sensor E2E Tests`]: {
    tests: {
      "Publish test X": {
        tests: [
          {
            skip: false,
            name: "Can publish",
            options: () => {},
            url: () => `mqtt://${mqttUrl}`,
            verb: "publish",
            packet: () => ({
              topic: "testTopic",
              payload: "testPayload",
            }),
            timeout: 150,
            expect: async (packet) => {
              expect(packet.payload).to.be.equal(testPayload);
            },
            error: (err) => {
              throw err;
            },
          },
        ],
      },
      "Publish / subscribe test X": {
        tests: [
          {
            name: "Can subscribe and receive message",
            options: () => {},
            url: () => `mqtt://${mqttUrl}`,
            error: (err) => {
              throw err;
            },
            steps: [
              {
                verb: "subscribe",
                packet: () => ({
                  topic: `12345-in/1/#`,
                }),
                timeout: 200,
                expect: (message) => {
                  expect(message.topic).to.be.equal("12345-in/1/3303/0/1/5700");
                  expect(message.payload).to.be.equal("42");
                },
              },
              () => ({
                verb: "publish",
                packet: () => ({
                  topic: "12345-in/1/3303/0/1/5700",
                  payload: "42",
                }),
                timeout: 300,
              }),
            ],
          },
        ],
      },
    },
  },
};
```

It uses [Mocha][mocha] and exposes its BDD API.

## Installation

```bash
npm install --save-dev mqtt-declarative-e2e-test

# or
npm i -D mqtt-declarative-e2e-test
```

## Issues

Please share your feedback and report the encountered issues on the [project's issues page][projectissues].

[projectissues]: https://github.com/marc-ed-raffalli/declarative-test-structure-generator/issues
[mocha]: https://mochajs.org/
