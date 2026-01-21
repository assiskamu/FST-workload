(function () {
  const STORAGE_KEY = 'fst_workload_v1';

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { records: [], elementConfig: {} };
      }
      const parsed = JSON.parse(raw);
      return {
        records: Array.isArray(parsed.records) ? parsed.records : [],
        elementConfig: parsed.elementConfig && typeof parsed.elementConfig === 'object' ? parsed.elementConfig : {}
      };
    } catch (error) {
      return { records: [], elementConfig: {} };
    }
  }

  function writeStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function generateId() {
    return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  let dataHandler = null;

  function notifyChange() {
    if (dataHandler && typeof dataHandler.onDataChanged === 'function') {
      const store = readStore();
      dataHandler.onDataChanged([...store.records]);
    }
  }

  window.dataSdk = {
    async init(handler) {
      dataHandler = handler;
      notifyChange();
      return { isOk: true };
    },
    async create(type, item) {
      let record = item;
      if (typeof type === 'string') {
        record = { ...(item || {}), section: item?.section || type };
      } else {
        record = { ...(type || {}) };
      }

      if (!record.__backendId) {
        record.__backendId = generateId();
      }

      const store = readStore();
      store.records.push(record);
      writeStore(store);
      notifyChange();
      return { isOk: true, data: record };
    },
    async update(type, id, patch) {
      const store = readStore();
      let updatedRecord = null;

      if (typeof type === 'string' && id !== undefined) {
        const index = store.records.findIndex(
          (record) => record.__backendId === id && (!type || record.section === type)
        );
        if (index === -1) {
          return { isOk: false, error: 'Record not found' };
        }
        updatedRecord = { ...store.records[index], ...(patch || {}) };
        store.records[index] = updatedRecord;
      } else {
        const record = type;
        if (!record || !record.__backendId) {
          return { isOk: false, error: 'Invalid record' };
        }
        const index = store.records.findIndex((item) => item.__backendId === record.__backendId);
        if (index === -1) {
          return { isOk: false, error: 'Record not found' };
        }
        updatedRecord = { ...store.records[index], ...record };
        store.records[index] = updatedRecord;
      }

      writeStore(store);
      notifyChange();
      return { isOk: true, data: updatedRecord };
    },
    async delete(type, id) {
      const store = readStore();
      const backendId = typeof type === 'string' && id !== undefined ? id : type?.__backendId;

      if (!backendId) {
        return { isOk: false, error: 'Invalid record' };
      }

      const index = store.records.findIndex((record) => record.__backendId === backendId);
      if (index === -1) {
        return { isOk: false, error: 'Record not found' };
      }

      const removed = store.records.splice(index, 1)[0];
      writeStore(store);
      notifyChange();
      return { isOk: true, data: removed };
    },
    async list(type) {
      const store = readStore();
      const data = type ? store.records.filter((record) => record.section === type) : store.records;
      return { isOk: true, data: [...data] };
    },
    async get(type, id) {
      const store = readStore();
      let record = null;

      if (typeof type === 'string' && id !== undefined) {
        record = store.records.find(
          (item) => item.__backendId === id && (!type || item.section === type)
        );
      } else if (type) {
        record = store.records.find((item) => item.__backendId === type);
      }

      return { isOk: Boolean(record), data: record || null };
    }
  };

  window.elementSdk = {
    config: {},
    _onConfigChange: null,
    async init(options = {}) {
      const store = readStore();
      const initialConfig = { ...(options.defaultConfig || {}), ...(store.elementConfig || {}) };
      this.config = { ...initialConfig };
      this._onConfigChange = options.onConfigChange || null;
      if (this._onConfigChange) {
        await this._onConfigChange(this.config);
      }
      return { isOk: true };
    },
    setConfig(partial) {
      this.config = { ...this.config, ...(partial || {}) };
      const store = readStore();
      store.elementConfig = { ...this.config };
      writeStore(store);
      if (this._onConfigChange) {
        this._onConfigChange(this.config);
      }
    }
  };
})();
