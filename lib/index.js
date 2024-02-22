/**
 * @template TYield
 * @template TReturn
 * @template TYieldMapped
 * @template TReturnMapped
 * @param {AsyncGenerator<TYield, TReturn>} generator
 * @param {Partial<{ yield: (value: TYield) => TYieldMapped, return: (value: TReturn) => TReturnMapped, catch: (error: any) => void }>} transforms
 * @returns {AsyncGenerator<TYieldMapped, TReturnMapped>}
 */
export function map(generator, transforms = {}) {
  const map_yield = transforms.yield || (value => value)
  const map_return = transforms.return || (value => value)
  const handle_error = transforms.catch || null

  return (async function*() {
    try {
      let result = await generator.next()

      while (!result.done) {
        /** @type {TYieldMapped} */
        // @ts-ignore -- we've effectively asserted that it's the yield type
        const mapped_yield = map_yield(result.value)
        yield mapped_yield
        result = await generator.next()
      }

      if (result.done) {
        /** @type {TReturnMapped} */
        // @ts-ignore -- as above but for the return type
        const mapped_return = map_return(result.value)
        return mapped_return
      }
    } catch (error) {
      if (handle_error) {
        handle_error(error)
      } else {
        throw error
      }
    }
  })()
}
