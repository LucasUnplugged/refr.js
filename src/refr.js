class Refr {
  constructor() {
    // Init the empty store
    this.store = {};
  }

  // Add or update store data
  load(storeName, sourceData, schema, isUpdate) {
    // Init the named store, if need be
    if (!this.store[storeName]) {
      this.store[storeName] = {};
    }

    // Source data is required
    if (!sourceData || typeof sourceData !== 'object') {
      return;
    }

    const dataList = (Array.isArray(sourceData)) ? sourceData : [sourceData]; // Make sure we have an array
    const refList = [];
    const schemaProps = (schema && typeof schema === 'object') ? Object.keys(schema) : null;

    // Iterate through the source data
    dataList.forEach(item => {
      // Each item MUST have a unique id
      if (!item.id) {
        return;
      }

      // Init the existing item, if need be
      const existingItem = this.store[storeName][item.id];
      if (!existingItem) {
        this.store[storeName][item.id] = {};
      }

      // Run through ALL item keys, old and new
      const itemKeys = Object.keys(Object.assign({}, item, existingItem));

      // Update each item individually, to preserve references
      // TODO: Consider making this recursive (deep merge)
      itemKeys.forEach(key => {
        // If the new data has this prop, replace the existing value of this prop
        if (item[key] !== undefined) {
          // If this is a normalized list, copy its references, not the list
          if (schemaProps && schemaProps.includes(key)) {
            this.store[storeName][item.id][key] = this.getNormalizedList(key, item[key]);
          } else {
            this.store[storeName][item.id][key] = item[key];
          }
        }
      });

      // Update the item instance count
      if (!isUpdate) {
        if (this.store[storeName][item.id].instances === undefined) {
          this.store[storeName][item.id].instances = 1;
        } else {
          this.store[storeName][item.id].instances++;
        }
      }

      // Save a reference to the stored item
      refList.push(this.store[storeName][item.id]);
    });

    // Return our reference data list
    return refList;
  }

  // Only update the data (no instance increment)
  update(storeName, data) {
    this.load(storeName, data, null, true);
  }

  // Unload one or more items from a store
  unload(storeName, sourceKeys) {
    if (!this.store[storeName]) {
      return;
    }

    const keys = (typeof sourceKeys === 'object') ? sourceKeys : [sourceKeys];

    // Decrement items in store, and remove as needed
    keys.forEach(key => {
      if (this.store[storeName][key] !== undefined) {
        if (!this.store[storeName][key].instances || (this.store[storeName][key].instances - 1) === 0) {
          // Remove the item
          delete this.store[storeName][key];
        } else {
          // Unload the item
          this.store[storeName][key].instances--;
        }
      }
    });
  }

  // Normalize nested data (array)
  normalize(sourceData, schema, rootLevelKey) {
    const schemaProps = (schema && typeof schema === 'object') ? Object.keys(schema) : null;
    let data = [];

    // If we have a schema, deal with nesting first, recursively
    if (schemaProps) {
      sourceData.forEach(sourceItem => {
        // Start by cloning the source item
        let item = Object.assign({}, sourceItem);

        // Then recursively switch nested data to references, based on the schema
        schemaProps.forEach(prop => {
          item[prop] = this.normalize(item[prop], schema[prop], prop);
        });

        data.push(item);
      });
    }

    // If we have a root level key, use the stored item reference, instead of the item object
    return (rootLevelKey) ? this.load(rootLevelKey, sourceData, schema) : data;
  }

  // Rebuild a list to ensure if references the normalized data store
  getNormalizedList(key, list) {
    const data = [];
    list.forEach(listItem => {
      const refItem = this.store[key][listItem.id];
      data.push(refItem);
    });
    return data;
  }
}

const refr = new Refr();

export default refr;
