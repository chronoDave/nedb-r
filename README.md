# Leaf-DB

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![NPM](https://img.shields.io/npm/v/leaf-db?label=npm)](https://www.npmjs.com/package/leaf-db)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/leaf-db@latest.svg)](https://bundlephobia.com/result?p=leaf-db@latest)
![leaf-db](https://github.com/chronoDave/leaf-db/workflows/leaf-db/badge.svg?branch=master)

An small, embeddable database for [node.js](https://nodejs.org/en/).

## Installation

```
// Yarn
yarn add leaf-db

// Npm
npm i leaf-db
```

## Getting started

```JS
// ES5
const LeafDB = require('leaf-db').default;
// ES6
import LeafDB from 'leaf-db';

const db = new LeafDB('example');

db.insert({ species: 'cat', name: 'whiskers' })
  .then(() => console.log('added whiskers to the database!'))
  .catch(console.error)
```
## API

 - [Database](#database)
   - [Create / load](#create-load)
   - [Persistence](#persistence)
   - [Corruption](#corruption)
 - [Inserting docs](#inserting-docs)
 - [Finding docs](#finding-docs)
   - [Basic query](#basic-query)
   - [Dot notation](#dot-notation)
   - [Operators](#operators)
   - [Projection](#projection)
   - [Indexing](#indexing)
 - [Updating docs](#updating-docs)
   - [Modifiers](#modifiers)
 - [Deleting docs](#deleting-docs)
 - [Dropping database](#drop)

## Database

### Create / load

`const db = new LeafDB(name, { root, autoload, strict })`

 - `name` - Database name
 - `options.root` - Database root path, will create in-memory if not provided (default `null`)
 - `options.autoload` - Should database be loaded on creation (default `true`)
 - `options.strict` - Should database throw silent errors (default `false`)

```JS
// Memory-only database
const db = new Datastore('db')

// Persistent database with manual load
const db = new Datastore('db', { root: process.cwd(), autoload: false })
// Loading is not neccesary, but recommended
// Not loading means the data from file isn't read,
// which can cause data loss when `persist()` is called (as it overwrites the file)
db.load()

// Persistent database with autoload
const db = new Datastore('db', { root: process.cwd() })
```

### Persistence

By default, `Leaf-DB` does not write directly to file. To make sure the data is persistent, call `persist()`, which will write valid to disk. Keep in mind that this function is sync, so calling this will block. To clean internal memory, call `load()` after `persist()`.

If `strict` is enabled, `persist()` will throw an error if corrupted data is found.

### Corruption

Calling `load()` will return an array of corrupted raw data (string). When `persist()` is called, all corrupt items will be removed from file, so if data integrity is important make sure to re-insert (via `insert()` or `update()`) those items before calling `persist()`.

## Inserting docs

`db.insert(newDocs, options) => Promise`

 - `newDocs` - Single doc or array of docs to insert
 - `options.persist` - Should insert call persist (default `false`)

Inserts doc(s) into the database. `_id` is automatically generated (~16 character string) if the field does not exist.

Fields cannot start with `$` (modifier field) or contain `.` (used for dot-queries). Values cannot be `undefined`.

`insert()` will fail if doc(s) are invalid. If `strict` is enabled, `insert()` will reject on the first invalid doc. Insertion takes place _after_ all docs are validated, meaning no data will be inserted if `insert()` rejects.

`Leaf-DB` does not keep track of when docs are inserted, updated or deleted.

<b>Example</b>

```JS
const doc = {
  crud: 'create',
  data: [{
    field: 1
  }]
}

try {
  await db.create(insert)
} catch (err) {
  console.error(err)
}
```

## Finding docs

### Basic query

`await db.find(query, projection) => Promise([docs])`

 - `query` - Query object (default `{}`)
 - `projection` - Projection (default `null`)

`await findById([_id]m projection) => Promise([docs])`

 - `_id` - Doc `_id`
 - `projection` - Projection (default `null`)

Find doc(s) matching query. Operators and dot notation are supported and can be mixed together.

```JS
// Data
// { _id: 1, type: 'normal', important: false, variants: ['weak', 'strong'] }
// { _id: 2, type: 'normal', important: true, variants: ['weak', 'strong'] }
// { _id: 3, type: 'strong', important: false, variants: ['weak', 'strong'] }
// { _id: 4, type: 'weak', variants: ['weak'], properties: { type: 'weak', parent: 3 } }

// Find docs matching type 'normal'
// [1, 2, 3] (Doc _id's)
await db.find({ type: 'normal' })

// Find all docs matching type 'normal' and important 'true'
// [2], all fields must match
await db.find({ type: 'normal', important: 'true' })

// Find all docs with variants 'weak'
// [4], note how only 4 matches, even though all entries contain weak
// Array content and order must mach
await db.find({ variant: ['weak'] })

// Find all docs with variants 'strong', 'weak', in that order
// []
await db.find({ variant: ['strong', 'weak'] })

// Find all docs with parent '3'
// [], all keys must be present
await db.find({ properties: { parent: 3 } })
// [4], key order does not matter
await db.find({ properties: { parent: 3, type: 'weak' } })
```

### Dot notation

Dot notation can be used to match nested fields

```JS
// Data
// { _id: 1, variants: ['normal', 'strong'], properties: { type: 'weak', parent: 3 } }
// { _id: 2, variants: ['strong', 'normal'], properties: { type: 'weak', parent: 3 } }
// { _id: 3, variants: [{ id: 'strong', properties: [{ type: 'weak' }] }] }

// Find all docs with properties.type 'weak'
// [1, 2]
await db.find({ 'properties.type': 'weak' })

// Find all docs where first entry of variants is `strong`
// [2]
await db.find({ 'variants.0': 'strong' })
// Brackets can be used for arrays as well
await db.find({ 'variants[0]': 'strong' })

// Find all docs where type of first entry of properties of first entry of variants is 'weak'
// [3]
await db.find({ 'variants.0.properties.0.type': 'weak' })
```

### Operators

Operators can be used to create advanced queries. The following operators are supported:

<b>Logic operators</b>

 - `$gt` - Is greater than
 - `$gte` - Is greater or equal than
 - `$lt` - Is less than
 - `$lte` - Is less or equal than
 - `$not` - Is not equal

<b>String operators</b>

 - `$stringStrict` - Does string include string
 - `$string` - Does string include string, case insensitive

<b>Object operators</b>

 - `$exists` - Does object key exist

<b>Array operators</b>

These operators will return false if the queries field is not an array

 - `$has` - Does array contain value
 - `$some` - Does any query match

<b>Example</b>

```JS
// Data
// { _id: 1, type: 'normal', important: false, variants: ['weak', 'strong'] }
// { _id: 2, type: 'normal', important: true, variants: ['weak', 'strong'] }
// { _id: 3, type: 'strong', important: false, variants: ['weak', 'strong'] }
// { _id: 4, type: 'weak', variants: ['weak'], properties: { type: 'weak', parent: 3, variants: ['strong'] } }
// { _id: 5, properties: [{ variants: ['weak', 'normal' ] }, { type: 'strong' }] }

// $gt / $gte / $lt / $lte
// [3, 4]
await db.find({ $gt: { _id: 2 } })
// [4], all fields within '$lte' must match
await db.find({ $lte: { _id: 4, 'properties.parent': 3 }})

// $not
// [2, 3, 4, 5]
await db.find({ $not: { _id: 3 } })

// $string
// [1, 2]
await db.find({ $string: { type: 'mal' } })
// []
await db.find({ $string: { type: 'MAL' } })
// [1, 2]
await db.find({ $stringLoose: { type: 'MAL' } })

// $exists
// [1, 2, 3, 4]
await db.find({ $exists: 'type' })
// [1, 2, 3]
await db.find({ $exists: ['type', 'important'] })

// $has
// [1, 2, 3, 4]
await db.find({ $has: { variants: 'weak' } })
// [4]
await db.find({ $has: { 'properties.variants': 'strong' } })
// Error, field is not an array
await db.find({ $has: { type: 'weak' } })
// Error, dot notation isn't a valid object field
await db.find({ $has: { properties: { 'variants.0': 'weak' } } })

// $some
// [1, 2, 4]
await db.find({ $some: [{ type: 'weak' }, { type: 'normal' }] })
// [1, 2, 3, 4, 5]
await db.find({ $some: [{ $has: { variants: 'weak' } }, { _id: 5 }] })
```

### Projection

`Leaf-DB` supports projection. When using projection, only the specified fields will be returned. Empty objects can be returned if `projection` is `[]`, or when none of the fields provided exist on the found objects.

<b>Example</b>

```JS
// Data
// { _id: 1, type: 'normal', important: false, variants: ['weak', 'strong'] }
// { _id: 2, type: 'normal', important: true, variants: ['weak', 'strong'] }
// { _id: 3, type: 'strong', important: false, variants: ['weak', 'strong'] }
// { _id: 4, type: 'weak', variants: ['weak'], properties: { type: 'weak', parent: 3, variants: ['strong'] } }
// { _id: 5, properties: [{ variants: ['weak', 'normal' ] }, { type: 'strong' }] }

// [{ _id: 1 }, { _id: 2 }]
await db.find({ type: 'normal' }, ['_id'])

// [{ type: 'normal' }, { type: 'normal' }, { type: 'strong' }, { type: 'weak' }, {}]
await db.find({}, ['type'])
```

### Indexing

`Leaf-DB` uses a hash table under the hood to store docs. All docs are indexed by `_id`, meaning using any `byId` query is considerably faster than its regular counterpart.

The `byId` queries accept a single `_id` string, or an array of `_id` strings.

## Updating docs

`await update(query, update, options) => Promise([docs])`

 - `query` - Query object (default `{}`)
 - `update` - Update object (default `{}`)
 - `options.projection` - Projection (default `null`)
 - `options.persist` - Should updated docs be persisted (default `false`)

`await updateById([_id], update, options) => Promise([docs])`

 - `_id` - Doc `_id`
 - `update` - Update object (default `{}`)
 - `options.projection` - Projection (default `null`)
 - `options.persist` - Should updated docs be persisted (default `false`)

Find doc(s) matching query object. `update()` supports modifiers, but fields and modifiers cannot be mixed together. `update` cannot create invalid field names, such as fields containing dots or fields starting with `$`. Returns the updated docs.

If no modifiers are provided, `update()` will override the found doc(s) with `update`

`_id` fields cannot be overwritten. Trying to do so will throw an error.

<b>Example</b>

```JS
// Data
// { _id: 1, type: 'normal', important: false, variants: ['weak', 'strong'] }
// { _id: 2, type: 'normal', important: true, variants: ['weak', 'strong'] }
// { _id: 3, type: 'strong', important: false, variants: ['weak', 'strong'] }
// { _id: 4, type: 'weak', variants: ['weak'], properties: { type: 'weak', parent: 3, variants: ['strong'] } }

// Set all docs to {}
await db.update()

// Set matching docs to { type: 'strong' }
// { _id: 1, type: 'strong' }
// { _id: 2, type: 'strong' }
// { _id: 3, type: 'strong', important: false, variants: ['weak', 'strong'] }
// { _id: 4, type: 'weak', variants: ['weak'], properties: { type: 'weak', parent: 3, variants: ['strong'] } }
await db.update({ type: 'normal' }, { type: 'strong' })

// _id fields will not be overwritten
// { _id: 1, type: 'strong' }
// { _id: 2, type: 'strong' }
// { _id: 3, type: 'strong', important: false, variants: ['weak', 'strong'] }
// { _id: 4, type: 'weak', variants: ['weak'], properties: { type: 'weak', parent: 3, variants: ['strong'] } }
await db.update({ type: 'normal' }, { type: 'strong', _id: 1 })

// Error, dot notation isn't a valid field
await db.update({ type: 'normal' }, { 'properties.type': 'strong', _id: 1 })
```

### Modifiers

Modifiers can be used to set specific values

 - `$add` - Add value (number)
 - `$push` - Add value (array)
 - `$set` - Set value

<b>Example</b>

```JS
// Data
// { _id: 1 }
// { _id: 2 }
// { _id: 3, count: 3 }

// $add
// { _id: 3, count: 9 }
await db.update({} }, { $add: { count: 3 } })
// { _id: 3, count: 3 }
await db.update({}, { $add: { count: -3 } })

// $push
// { _id: 3, fruits: ['banana'] }
await db.update({} }, { $push: { count: 'orange' } })
// { _id: 3 , fuits: ['banana', 'orange'] }

// $set
// { _id: 3, count: 'count' }
await db.update({ $exists: 'count' }, { $set: { count: 'count' } })
// { _id: 1, value: 3 }
// { _id: 2, value: 3 }
// { _id: 3, count: 3, value: 3 }
// Keys will be created if it does not exist
await db.update({}, { $set: { value: 3 } })
```

## Deleting docs

`await delete(query, options) => Promise(n)`

 - `query` - Query object (default `{}`)
 - `options.persist` - Should deleted docs be persisted (default `false`)

`await deleteById([_id], options) => Promise(n)`

 - `_id` - Doc `_id`
 - `options.persist` - Should deleted docs be persisted (default `false`)

Delete doc(s) matching query object.

<b>Example</b>

```JS
// Data in database
// { _id: 1, type: 'normal', important: false, variants: ['weak', 'strong'] }
// { _id: 2, type: 'normal', important: true, variants: ['weak', 'strong'] }
// { _id: 3, type: 'strong', important: false, variants: ['weak', 'strong'] }
// { _id: 4, type: 'weak', variants: ['weak'], properties: { type: 'weak', parent: 3, variants: ['strong'] } }

// Delete all data
// []
await db.delete()

// Delete first match
// [1, 3, 4]
await db.delete({ _id: 2 })

// Delete all matches
// [3, 4]
await db.delete({ type: 'normal' }, { multi: true })
```

### Drop

`await drop() => Promise(n)`

Clears both memory and database file.

## Testing

### Unit test

```
yarn test

$ tape test/**/*.spec.js
TAP version 13
# [constructor] should create in-memory database
ok 1 should be truthy
ok 2 should be strictly equal
ok 3 should be falsy

...

# [isQueryMatch] operator $has should return false if object does not contain value
ok 305 should be falsy
ok 306 should be falsy
ok 307 should be falsy

1..307
# tests 307
# pass  307

# ok

Done in 0.94s.
```

### Benchmark

```
yarn bench

$ node test/benchmark.js
Starting benchmark: insert()
Starting benchmark: find()
Starting benchmark: findById()
Starting benchmark: update()
Starting benchmark: updateById()
Starting benchmark: delete()
Starting benchmark: deleteById()

Database size: 100000, sample size: 1000

insert()
Total:671.990ms
Avg: 0.672ms

find()
Total:99206.610ms
Avg: 99.207ms

findById()
Total:1.690ms
Avg: 0.002ms

update()
Total:72107.507ms
Avg: 72.108ms

updateById()
Total:3.109ms
Avg: 0.003ms

delete()
Total:68455.880ms
Avg: 68.456ms

deleteById()
Total:1.445ms
Avg: 0.001ms
Done in 240.74s.
```

## Attribution

This project is heavily inspired by [louischatriot/nedb](https://github.com/louischatriot/nedb).

## License

[GNU General Public License v3](./LICENSE).

## Donating

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Y8Y41E23T)
