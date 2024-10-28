const cache = {};

export const getFromCache = (key) => cache[key];

export const setToCache = (key, value) => {
  cache[key] = value;
};