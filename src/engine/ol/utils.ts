/**
 * utils.ts
 * OpenLayers 工具函数库
 * @author Sogrey
 * @date 2025-06-01 00:00:00
 * @lastModify 2025-06-01 00:00:00
 * @version 1.0.0
 */

/**
 * 获取指定范围内的随机整数
 * 生成一个包含最小值和最大值的随机整数（左闭右开区间）
 * @param {number} min - 最小值（包含）
 * @param {number} max - 最大值（不包含）
 * @return {number} 返回指定范围内的随机整数
 * @example
 * ```typescript
 * // 获取 1 到 10 之间的随机整数
 * const randomNum = getRandomInt(1, 11);
 * console.log(randomNum); // 输出：5（示例值）
 *
 * // 获取 0 到 100 之间的随机整数
 * const percent = getRandomInt(0, 101);
 * ```
 */
export const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min)) + min
}

/**
 * 生成符合 RFC 4122 标准的 UUID
 * 生成唯一标识符，支持自定义前缀，适用于各种需要唯一标识的场景
 * @param {string} prefix - 可选前缀，用于区分不同类型的 UUID
 * @return {string} 返回生成的 UUID 字符串
 * @example
 * ```typescript
 * // 生成标准 UUID
 * const id = uuid();
 * console.log(id); // 输出："550E8400-E29B-11D4-A716-446655440000"
 *
 * // 生成带前缀的 UUID
 * const mapId = uuid('map');
 * console.log(mapId); // 输出："map-550E8400-E29B-11D4-A716-446655440000"
 *
 * // 生成图层 UUID
 * const layerId = uuid('layer');
 * ```
 * @see https://tools.ietf.org/html/rfc4122
 */
export const uuid = (prefix: string = '') => {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'

  let uuid = template
    .replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
    .toUpperCase()

  if (prefix) {
    uuid = prefix + '-' + uuid
  }

  return uuid
}
