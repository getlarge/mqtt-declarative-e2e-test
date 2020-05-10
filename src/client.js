const mqtt = require('mqtt');
const util = require('util');

const callbackOrValue = o => (typeof o === 'function' ? o() : o);

const valueOrPromise = o => {
  if (typeof o === 'function') {
    if (util.types.isAsyncFunction(o)) {
      return o().then(res => res);
    }
    return Promise.resolve(o()).then(res => res);
  }
  return Promise.resolve(o).then(res => res);
};

const observablePromise = promise => {
  if (promise.isResolved) return promise;

  let isPending = true;
  let isRejected = false;
  let isResolved = false;

  // Observe the promise, saving the fulfillment in a closure scope.
  const result = promise.then(
    function(v) {
      isResolved = true;
      isPending = false;
      return v;
    },
    function(e) {
      isRejected = true;
      isPending = false;
      throw e;
    },
  );

  result.isResolved = () => isResolved;
  result.isPending = () => isPending;
  result.isRejected = () => isRejected;

  result.state = () => ({
    isPending,
    isResolved,
    isRejected,
  });

  return result;
};

function delayedFn(fn, delay) {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const res = util.types.isAsyncFunction(fn) ? await fn() : await Promise.resolve(fn());
        resolve(res);
      } catch (err) {
        reject(err);
      }
    }, delay);
  });
}

class Client {
  constructor(definition = {}, config = {}) {
    this.definition = definition;

    this.connection =
      config && config.connection ? config.connection : Client.buildClient(definition);

    return this;
  }

  static buildClient(definition) {
    const url = Client.getUrl(definition.url);
    const options = Client.getOptions(definition.options);
    this.definition = { ...definition, url, options };

    // console.log(`Building client for ${url}`);
    const client = mqtt.connect(url, options);
    return client;
  }

  static getUrl(url) {
    return callbackOrValue(url);
  }

  static getOptions(options) {
    return callbackOrValue(options);
  }

  static getEvent(event) {
    return callbackOrValue(event);
  }

  static getPacket(packet) {
    return valueOrPromise(packet);
  }

  get connection() {
    return this._connection;
  }

  set connection(conn) {
    this._connection = conn;
  }

  get definition() {
    return this._definition;
  }

  set definition(def) {
    this._definition = def;
  }

  static process(client, definition) {
    // console.log('client processing');
    if (definition.steps) {
      return Promise.all(
        definition.steps.map(async (stepDef, index) => {
          stepDef = typeof stepDef === 'function' ? stepDef() : stepDef;
          const promise = observablePromise(
            Client.processDefinition(client, {
              ...definition,
              ...stepDef,
            }),
          );
          console.log(`process test step`, {
            state: promise.state(),
          });

          const result = await promise;
          console.log(`process test step ${index}`, {
            state: promise.state(),
          });
          return result;
        }),
      );
    }

    return Client.processDefinition(client, definition);
  }

  static async processDefinition(client, definition) {
    const event = Client.getEvent(definition.event);
    const packet = await Client.getPacket(definition.packet);

    client.definition = { ...definition, packet, event };

    // console.log('client definition:', client.definition);
    return Client.processPubSub(client, client.definition);
  }

  static processPubSub(client, definition) {
    const { packet, config, verb, timeout } = definition;

    if (verb === 'publish') {
      return new Promise((resolve, reject) =>
        client.connection[verb](packet.topic, packet.payload, config, err => {
          if (err) return reject(err);
          return delayedFn(async () => client.test(packet, definition), timeout || 100)
            .then(() => resolve(packet))
            .catch(reject);
        }),
      );
    } else if (verb === 'subscribe') {
      return new Promise((resolve, reject) =>
        client.connection[verb](packet.topic, config, err => {
          if (err) return reject(err);
          let passedExpect = false;
          setTimeout(
            () => (passedExpect ? null : reject(new Error('Test timedout'))),
            timeout || 100,
          );

          client.connection.once('message', (topic, payload) => {
            passedExpect = true;
            client
              .test({ topic, payload }, definition)
              .then(() => resolve({ topic, payload }))
              .catch(e => reject(e));
          });

          return null;
        }),
      );
    }

    return Promise.reject(new Error('Invalid definition verb'));
  }

  static async run(definition, config) {
    const client = new Client(definition, config);
    try {
      await client.waitEvent('connect');
      const res = await Client.process(client, this.definition);
      client.stop();
      return res;
    } catch (error) {
      return client.onError(error);
    }
  }

  stop() {
    // console.log('close client');
    this.connection.end(true);
  }

  waitEvent(event) {
    return new Promise((resolve, reject) => {
      this.connection.once(event, (...args) => resolve(args));
      this.connection.once('error', reject);
    });
  }

  test(message, definition) {
    const expected = definition.expect;

    if (!expected || typeof expected !== 'function') {
      // console.log('Provide an "expect" callback in the definition to execute acceptance tests');
      return Promise.resolve(null);
    }

    if (util.types.isAsyncFunction(expected)) {
      return expected(message);
    }
    return Promise.resolve(expected(message));
  }

  onError(err) {
    this.stop();

    const error = this.definition.error;
    if (!error || typeof error !== 'function') {
      // console.log(
      //   'Provide an "error" callback in the definition or global config to access all info',
      // );
      return;
    }

    error(err);
  }
}

module.exports = Client
