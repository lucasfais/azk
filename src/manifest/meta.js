import { _, fs, lazy_require } from 'azk';
import Utils from 'azk/utils';

/* global mkdir, createCache */
lazy_require(this, {
  mkdir      : ['mkdirp', 'sync'],
  createCache: ['fscache', 'createSync'],
});

/**
 * Save meta information * (like database, but more simple)
 *
 * @param {object} options            - Meta options
 * @param {string} options.cached_dir - Directory to persist meta data
 * @param {object} [cache=fscache]    - Cache class
 **/
export class Meta {
  constructor(options, cache = null) {
    this.options = options;
    this.cache   = cache;
  }

  set cache(value) {
    this.__cache = value;
  }

  clean() {
    var path = this.options.cache_dir;
    if (fs.existsSync(path)) {
      this.__cache = null;
      return fs.removeSync(path);
    }
  }

  get cache() {
    if (!this.__cache) {
      var cache_dir = this.options.cache_dir;
      mkdir(cache_dir);
      this.__cache = createCache(cache_dir);
    }
    return this.__cache;
  }

  getOrSet(key, defaultValue) {
    var value = this.cache.getSync(key);
    if (_.isUndefined(value) && defaultValue) {
      value = defaultValue;
      this.set(key, value);
    }
    return value;
  }

  get(key, defaultValue) {
    return this.cache.getSync(key) || defaultValue;
  }

  set(key, value) {
    this.cache.putSync(key, value);
    return this;
  }
}

export class FakeCache {
  constructor() {
    this.values = {};
  }

  clean() {
    this.values = {};
  }

  keyCalc(key) {
    return Utils.calculateHash(JSON.stringify(key));
  }

  getSync(key) {
    return this.values[this.keyCalc(key)];
  }

  putSync(key, value) {
    this.values[this.keyCalc(key)] = value;
  }
}
