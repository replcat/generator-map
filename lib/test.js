import assert from "node:assert/strict"
import { test } from "node:test"
import { map } from "./index.js"

test("mapped yield", async () => {
  /** @param {number} n */
  const generator_fn = async function*(n) {
    yield 1 * n
    yield 2 * n
  }

  const f = map(generator_fn(2), {
    yield: value => value * 2, // 4, 8
  })

  const expected_values = [4, 8]

  let i = 0
  for await (const value of f) {
    assert.strictEqual(value, expected_values[i])
    i++
  }

  assert.strictEqual(i, expected_values.length)
})

test("mapped return", async () => {
  /** @param {number} n */
  const generator_fn = async function*(n) {
    yield 1 * n
    return 2 * n
  }

  const f = map(generator_fn(2), {
    return: value => value * 2, // 8
  })

  let value = await f.next()
  while (!value.done) {
    value = await f.next() // discarding yield values
  }

  assert.strictEqual(value.value, 8)
})

test("handled error", async () => {
  const error_message = "cool error"

  /** @param {number} n */
  const generatorFunction = async function*(n) {
    yield 1 * n
    throw new Error(error_message)
  }

  let handled_error
  const f = map(generatorFunction(2), {
    catch: error => handled_error = error.message,
  })

  let did_throw = false
  try {
    for await (const _ of f) {} // discarding all values
  } catch (error) {
    did_throw = true // should not be reached
  }

  assert.strictEqual(handled_error, error_message)
  assert.strictEqual(did_throw, false)
})

test("unhandled error", async () => {
  const error_message = "cool error"

  /** @param {number} n */
  const generatorFunction = async function*(n) {
    yield 1 * n
    throw new Error(error_message)
  }

  const f = map(generatorFunction(2), {
    yield: value => value * 2,
  })

  let unhandled_error
  try {
    for await (const _ of f) {} // discarding all values
  } catch (error) {
    unhandled_error = error
  }

  assert.ok(unhandled_error instanceof Error)
  assert.strictEqual(unhandled_error.message, error_message)
})

test("composed", async () => {
  /** @param {number} n */
  async function* generator_fn(n) {
    yield 1 * n
    return String(2 * n)
  }

  const first = map(generator_fn(2), {
    yield: value => String(value * 2), // "4"
    return: value => parseInt(value) * 2, // 8
  })

  const second = map(first, {
    yield: value => parseInt(value), // 4
    return: value => String(value), // "8"
  })

  let value = await second.next()
  assert.strictEqual(value.done, false)
  assert.strictEqual(value.value, 4)

  value = await second.next()
  assert.strictEqual(value.done, true)
  assert.strictEqual(value.value, "8")
})

test("composing before initialisation", async () => {
  /** @param {number} n */
  async function* base(n) {
    yield 1 * n
    yield 2 * n
    yield 3 * n
    return String(4 * n)
  }

  /** @param {number} n */
  const mapped = n => map(base(n), {
    yield: value => String(value),
    return: value => parseInt(value),
  })

  const expected_values = ["2", "4", "6", 8]
  const actual_values = []

  const composed = mapped(2)

  actual_values.push(await composed.next())
  while (!actual_values[actual_values.length - 1].done) {
    actual_values.push(await composed.next())
  }

  assert.deepEqual(actual_values.map(value => value.value), expected_values)
})