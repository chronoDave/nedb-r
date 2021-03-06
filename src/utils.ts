import crypto from 'crypto';

export const toArray = <T>(any: T | Array<T>) => (Array.isArray(any) ? any : [any]);

/**
 * Generate unique ID
 * @param {number} length - ID length (can be shorter if ID contains invalid characters)
 * */
export const getUid = (length = 16) => crypto
  .randomBytes(Math.ceil((length * 5) / 4))
  .toString('base64')
  .replace(/[+/]/g, '')
  .slice(0, length);

/**
 * Check if `object` has `key` or `value`
 * @param {object} object
 * @param {object} options
 * @param {function} validator - `validator({ key, value }) => Boolean`
 */
export const objectHas = (
  object: object,
  validator: ({ key, value }: { key: string, value: unknown }) => boolean
) => {
  if (!object || typeof object !== 'object') return false;

  const stack = Object.entries(object);

  while (stack.length > 0) {
    const [key, value] = stack.pop();

    if (validator({ key, value })) return true;
    if (value && typeof value === 'object') stack.push(...Object.entries(value));
  }

  return false;
};
